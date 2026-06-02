//! AI 辅助模块 — OpenAI + 本地模型双实现
//!
//! 提交 prompt → AI 返回 DZ 文本 → Parser 校验 → 不安全则 AI 自我修正
//! 最多重试 3 次。**绝不**自动将 AI 产出写入 cards/ 目录。

use dz_cardmaker_ports::*;

pub struct OpenAIAssistant {
    api_key: String,
    model: String,
    endpoint: String,
}

impl OpenAIAssistant {
    pub fn new(api_key: &str, model: &str) -> Self {
        Self {
            api_key: api_key.to_string(),
            model: model.to_string(),
            endpoint: if model.contains("deepseek") {
                "https://api.deepseek.com/v1/chat/completions".into()
            } else {
                "https://api.openai.com/v1/chat/completions".into()
            },
        }
    }

    fn call_api(&self, system_prompt: &str, user_prompt: &str) -> Result<String, String> {
        let body = serde_json::json!({
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.3,
            "max_tokens": 2048
        });

        let client = reqwest::blocking::Client::new();
        let resp = client
            .post(&self.endpoint)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .map_err(|e| format!("API 请求失败: {}", e))?;

        let json: serde_json::Value = resp
            .json()
            .map_err(|e| format!("响应解析失败: {}", e))?;

        json["choices"][0]["message"]["content"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or("AI 响应格式异常".into())
    }
}

impl AIAssistantPort for OpenAIAssistant {
    fn generate_card(
        &self,
        prompt: &str,
        context: &AIContext,
    ) -> Result<AIGeneratedCard, String> {
        let system = build_system_prompt(context);
        let user = format!("请生成以下卡牌的完整 DZ 语法：\n{}", prompt);

        let result = self.call_api_with_retry(&system, &user, context, 0)?;

        Ok(result)
    }

    fn validate_and_fix(
        &self,
        dz_text: &str,
        errors: &[ParseError],
    ) -> Result<String, String> {
        let error_list: Vec<String> = errors
            .iter()
            .map(|e| format!("第{}行: {}", e.line, e.message))
            .collect();

        let system = "你是一个 DZ 语法专家。根据校验错误修正 DZ 文本。只输出完整的修正后 DZ 文本，不要任何解释。";
        let user = format!(
            "以下 DZ 文本有校验错误，请修正：\n\n```\n{}\n```\n\n错误列表：\n{}",
            dz_text,
            error_list.join("\n")
        );

        self.call_api(system, &user)
    }

    fn suggest_completion(
        &self,
        partial_dz: &str,
        cursor_position: usize,
    ) -> Result<Vec<CompletionSuggestion>, String> {
        let system = "你是 DZ 语法补全助手。根据上下文提供合法的语法补全建议。只输出 JSON 数组，每项包含 text/display/category。";
        let user = format!(
            "光标在 {} 位置，文本片段：\n\n```\n{}\n```\n\n请给出 3-5 个补全建议。",
            cursor_position, partial_dz
        );

        let response = self.call_api(system, &user)?;
        let suggestions: Vec<serde_json::Value> = serde_json::from_str(&response)
            .unwrap_or_default();

        Ok(suggestions
            .iter()
            .map(|s| CompletionSuggestion {
                text: s["text"].as_str().unwrap_or("").to_string(),
                display: s["display"].as_str().unwrap_or("").to_string(),
                category: s["category"].as_str().unwrap_or("").to_string(),
            })
            .collect())
    }
}

// ============================================================================
// 安全校验链 — 三层防火墙
// ============================================================================

const MAX_RETRIES: u32 = 3;

impl OpenAIAssistant {
    fn call_api_with_retry(
        &self,
        system: &str,
        user: &str,
        context: &AIContext,
        attempt: u32,
    ) -> Result<AIGeneratedCard, String> {
        if attempt >= MAX_RETRIES {
            return Err(format!(
                "AI 在 {} 次尝试后仍无法生成合法的 DZ 语法。请手动修正。",
                MAX_RETRIES
            ));
        }

        let dz_text = self.call_api(system, user)?;

        // 🔒 防火墙 1: 解析校验
        let parser = crate::parser::DZParser::new();
        let mark_registry = crate::parser::BundledMarkRegistry::new();

        match parser.parse(&dz_text) {
            Ok(ast) => {
                // 🔒 防火墙 2: 语义校验
                let warnings = parser.validate(&ast, &mark_registry);

                // 🔒 防火墙 3: 绝不自动写入 → 返回给调用方，由用户手动确认
                Ok(AIGeneratedCard {
                    dz_text,
                    warnings: warnings.iter().map(|w| w.message.clone()).collect(),
                    retry_count: attempt,
                })
            }
            Err(e) => {
                // 解析失败 → 告诉 AI 哪错了，重试
                let fix_prompt = format!(
                    "以下 DZ 文本有语法错误，请修正后重新输出：\n\n```\n{}\n```\n\n错误：{}",
                    dz_text, e.message
                );
                self.call_api_with_retry(system, &fix_prompt, context, attempt + 1)
            }
        }
    }
}

// ============================================================================
// 本地模型实现（ollama）
// ============================================================================

pub struct LocalModelAssistant {
    endpoint: String,
    model: String,
}

impl LocalModelAssistant {
    pub fn new(endpoint: &str, model: &str) -> Self {
        Self {
            endpoint: endpoint.to_string(),
            model: model.to_string(),
        }
    }

    fn call_ollama(&self, prompt: &str) -> Result<String, String> {
        let body = serde_json::json!({
            "model": self.model,
            "prompt": prompt,
            "stream": false
        });

        let client = reqwest::blocking::Client::new();
        let resp = client
            .post(format!("{}/api/generate", self.endpoint))
            .json(&body)
            .send()
            .map_err(|e| format!("Ollama 请求失败: {}", e))?;

        let json: serde_json::Value = resp
            .json()
            .map_err(|e| format!("响应解析失败: {}", e))?;

        json["response"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or("Ollama 响应格式异常".into())
    }
}

impl AIAssistantPort for LocalModelAssistant {
    fn generate_card(
        &self,
        prompt: &str,
        _context: &AIContext,
    ) -> Result<AIGeneratedCard, String> {
        let full_prompt = format!(
            "你是一个 DZ 卡牌语法生成器。请根据以下描述生成完整的 DZ 语法卡牌：\n\n{}\n\n只输出 DZ 文本，不要解释。",
            prompt
        );
        let dz_text = self.call_ollama(&full_prompt)?;

        // Same safety chain
        let parser = crate::parser::DZParser::new();
        let mark_registry = crate::parser::BundledMarkRegistry::new();
        let ast = parser.parse(&dz_text)
            .map_err(|e| format!("AI 生成的语法无效: {}", e.message))?;
        let warnings = parser.validate(&ast, &mark_registry);

        Ok(AIGeneratedCard {
            dz_text,
            warnings: warnings.iter().map(|w| w.message.clone()).collect(),
            retry_count: 0,
        })
    }

    fn validate_and_fix(
        &self,
        dz_text: &str,
        errors: &[ParseError],
    ) -> Result<String, String> {
        let error_list: Vec<String> = errors
            .iter()
            .map(|e| format!("第{}行: {}", e.line, e.message))
            .collect();
        let prompt = format!(
            "修正以下 DZ 文本的错误：\n\n```\n{}\n```\n\n错误：\n{}\n\n只输出修正后的 DZ。",
            dz_text, error_list.join("\n")
        );
        self.call_ollama(&prompt)
    }

    fn suggest_completion(
        &self,
        _partial_dz: &str,
        _cursor_position: usize,
    ) -> Result<Vec<CompletionSuggestion>, String> {
        Ok(Vec::new())
    }
}

// ============================================================================
// 系统提示构建
// ============================================================================

fn build_system_prompt(ctx: &AIContext) -> String {
    format!(
        r#"你是一个 DZ 卡牌语法生成器。你必须只输出合法的 DZ 语法文本。

## DZ 语法规范

{}

## 现有词条库

{}

## 现有卡池

{}

## 发行规则

{}

## 输出要求
1. 只输出 DZ 语法文本，用 ``` 代码块包裹
2. 不要添加任何解释、注释、问候语
3. 卡牌名称必须来自现有卡池或明确的新名称
4. 效果描述必须使用词条库中的表达方式
5. 标记引用使用「」括起
6. 备注约束使用 [] 括起"#,
        ctx.grammar_spec,
        ctx.lexicon,
        ctx.existing_cards_summary.join("\n"),
        ctx.distribution_rules
    )
}
