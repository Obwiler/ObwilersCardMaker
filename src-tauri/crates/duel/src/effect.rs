//! 效果解析器 - 将卡牌 AST 条目转为可执行的效果对象
//!
//! 效果类型对齐《对峙规则语法规范》附录 B 谓语动词词典及分类分析文档。

use serde::{Deserialize, Serialize};

use core::{DamageType, PlayerSide};

/// 卡牌五段式条目（统一类型，来自 core）
pub use core::FiveStageEntry as CardEntry;

// ============ 效果类型枚举 ============

/// 效果类型（对齐文档：附录B谓语动词词典 + 效果类型分类）
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum EffectType {
    /// 造成伤害：造成 N点物理/法术/真实伤害
    DealDamage {
        amount: i32,
        damage_type: DamageType,
    },
    /// 恢复生命
    Heal {
        amount: i32,
    },
    /// 恢复技力
    RestoreEnergy {
        amount: i32,
    },
    /// 获得护甲
    GainArmor {
        amount: i32,
    },
    /// 获得标记：积累 1个「仁心」标记
    GainMark {
        mark_name: String,
        count: i32,
        max: Option<i32>,
    },
    /// 消耗标记
    ConsumeMark {
        mark_name: String,
        count: i32,
    },
    /// 移除标记/护甲/技力
    Remove {
        target_what: String, // "标记"/"护甲"/"技力"
        amount: i32,
    },
    /// 弃置手牌
    Discard {
        count: i32,
        quality: Option<String>,
    },
    /// 抽取卡牌
    Draw {
        count: i32,
        card_type: Option<String>, // "基本牌"/"构筑卡"
    },
    /// 免疫伤害
    Immune {
        condition: String,
    },
    /// 抵消伤害
    CounterDamage {
        amount: i32,
    },
    /// 增加攻击力/法伤
    IncreaseStat {
        stat: String, // "物理伤害"/"法术伤害"/"技力上限"
        amount: i32,
        permanent: bool,
    },
    /// 降低数值
    DecreaseStat {
        stat: String,
        amount: i32,
        permanent: bool,
    },
    /// 扣除对方资源
    Deduct {
        resource: String, // "技力"/"生命"/"护甲"
        amount: i32,
    },
    /// 赋予护甲（给目标）
    GrantArmor {
        amount: i32,
    },
    /// 限制伤害上限
    LimitDamage {
        max_per_hit: i32,
    },
    /// 无效化卡牌/效果
    Nullify {
        target: String,
    },
    /// 封锁品质使用
    Seal {
        quality: String,
        duration: String,
    },
    /// 重置技能冷却
    ResetCooldown {
        skill_name: String,
    },
    /// 淘汰（直接出局）
    Eliminate,
    /// 使目标进入濒死
    SetNearDeath,
    /// 视为某效果
    TreatAs {
        card_name: String,
    },
    /// 存储卡牌为标记
    StoreAsMark {
        mark_name: String,
        max: i32,
    },
    /// 释放存储标记造成伤害
    ReleaseMarkDamage,
    /// 重排牌堆顶
    RearrangeTop {
        count: i32,
    },
    /// 更换身份/职业
    ChangeIdentity {
        identity: String,
    },
    /// 执行标签引用（嵌套效果块）
    ExecuteTag {
        tag_name: String,
    },
    /// 强制使效果生效
    ForceEffect {
        description: String,
    },
    /// 翻牌堆顶判定
    FlipJudge {
        description: String,
    },
    /// 复制效果
    CopyEffect {
        description: String,
    },
    /// 选择保留（检索后择优）
    SelectKeep {
        keep: i32,
        from: i32,
    },
    /// 放回牌堆
    ReturnToDeck {
        description: String,
    },
    /// 锁定单位
    LockTargets {
        count: i32,
    },
    /// 补充资源
    Replenish {
        resource: String,
        amount: i32,
    },
    /// 转化伤害类型
    ConvertDamage {
        to_type: DamageType,
    },
    /// 附加伤害
    BonusDamage {
        amount: i32,
        damage_type: DamageType,
    },
    /// 持续抽牌至手牌数等于目标
    DrawToMatch {
        target_side: PlayerSide,
    },
    /// 额外获得攻击次数
    GainExtraAttack {
        count: i32,
    },
    /// 查看/公示对手手牌
    RevealHand {
        target_side: PlayerSide,
    },
    /// 强制目标使用卡牌
    ForceUseCard,
    /// 禁止使用某品质卡牌
    BanQuality {
        quality: String,
    },
    /// 判定牌
    JudgeCard,
    /// 掠夺手牌
    StealHand {
        condition: String,
    },
}

// ============ 触发条件 ============

/// 触发条件
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum TriggerCondition {
    /// 无条件（常驻被动 / 默认触发）
    None,
    /// 消耗资源触发
    Cost {
        resource: String,   // "技力"/"生命"/"手牌"/"标记"
        amount: i32,
        extra: Option<String>,
    },
    /// 事件触发：获得XX时 / 使用XX后 / 受到伤害时
    OnEvent {
        event: String,      // "获得基本牌时"/"受到伤害时"/"使用技能后"/...
        params: Vec<String>,
    },
    /// 阈值触发：技力≥N / 标记≥N
    Threshold {
        stat: String,       // "技力"/"标记名"/"生命"
        operator: String,   // "≥"/"＜"/"="
        value: i32,
    },
    /// 状态判断：目标有护甲 / 目标手牌为0
    StateCheck {
        target: String,     // "目标"/"自身"
        condition: String,  // "有护甲"/"手牌＜2"/...
    },
    /// 累计追踪：累计受伤≥3点
    Cumulative {
        tracked: String,    // "受伤"/"治疗"/"触发次数"
        operator: String,
        value: i32,
    },
    /// 宣言条件
    Declare {
        what: String,       // "品质"/"模式"
        value: String,
    },
    /// 判定条件
    JudgeResult {
        condition: String,  // "判定牌品质"
        expected: String,
    },
    /// 序数条件：每回合第N次
    Ordinal {
        nth: i32,
        scope: String,      // "每回合"
    },
}

// ============ 目标选择 ============

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum TargetSelector {
    /// 自身
    Self_,
    /// 目标（当前攻击目标）
    Target,
    /// 攻击者
    Attacker,
    /// 伤害来源
    DamageSource,
    /// 所有其他玩家
    AllOthers,
    /// 指定玩家方
    Player(PlayerSide),
    /// 任意单位
    AnyUnit,
    /// 两个单位
    TwoUnits,
    /// 卡牌名指定
    CardName(String),
}

// ============ 效果对象 ============

/// 可执行的效果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Effect {
    /// 效果类型
    pub effect_type: EffectType,
    /// 触发条件
    pub trigger: TriggerCondition,
    /// 目标选择
    pub target: TargetSelector,
    /// 数值参数
    pub value: i32,
    /// 来源卡牌名
    pub source_card: String,
    /// 条件原文
    pub condition_text: String,
    /// 主语原文
    pub subject_text: String,
    /// 谓语原文
    pub predicate_text: String,
    /// 宾语原文
    pub object_text: String,
    /// 备注
    pub note: String,
    /// 限制说明
    pub limit: Option<String>,
}

impl Effect {
    /// 从 CardEntry（AST 解析后的五段式条目）构造 Effect
    pub fn from_entry(entry: &CardEntry, card_name: &str) -> Option<Effect> {
        let predicate = &entry.predicate;
        let object = &entry.object;
        let condition = &entry.condition;
        let subject = &entry.subject;
        let note = &entry.note;

        // 尝试提取数值
        let extract_number = |s: &str| -> Option<i32> {
            let mut num = String::new();
            let mut found = false;
            for c in s.chars() {
                if c.is_ascii_digit() || c == '-' || c == '.' {
                    num.push(c);
                    found = true;
                } else if found {
                    break;
                }
            }
            if found { num.parse::<f64>().ok().map(|f| f as i32) } else { None }
        };

        let value = extract_number(object).unwrap_or(1);

        // 解析触发条件
        let trigger = parse_condition(condition, object);

        // 解析主语 → 目标选择
        let target = parse_subject(subject);

        // 解析谓语 → 效果类型
        let effect_type = parse_predicate(predicate, object, value)?;

        // 解析备注中的限制
        let limit = if note == "—" || note.is_empty() {
            None
        } else {
            Some(note.clone())
        };

        Some(Effect {
            effect_type,
            trigger,
            target,
            value,
            source_card: card_name.to_string(),
            condition_text: condition.clone(),
            subject_text: subject.clone(),
            predicate_text: predicate.clone(),
            object_text: object.clone(),
            note: note.clone(),
            limit,
        })
    }
}

/// 解析条件段 → TriggerCondition
fn parse_condition(cond: &str, _object: &str) -> TriggerCondition {
    let cond = cond.trim();
    if cond.is_empty() || cond == "—" {
        return TriggerCondition::None;
    }

    // 消耗条件
    if cond.starts_with("消耗") {
        let rest = &cond[6..]; // 去掉"消耗"
        // 提取数字
        let mut num = 0i32;
        let mut resource = String::new();
        for c in rest.chars() {
            if c.is_ascii_digit() {
                num = num * 10 + (c as i32 - '0' as i32);
            } else if c != '点' && c != ' ' {
                resource.push(c);
            }
        }
        let resource = if resource.contains("技力") {
            "技力".to_string()
        } else if resource.contains("生命") {
            "生命".to_string()
        } else if resource.contains("标记") {
            "标记".to_string()
        } else if resource.contains("张") {
            "手牌".to_string()
        } else {
            "资源".to_string()
        };
        return TriggerCondition::Cost { resource, amount: num.max(1), extra: None };
    }

    // 事件触发
    if cond.contains("时") || cond.contains("后") {
        let event = cond.to_string();
        let params = vec![];
        return TriggerCondition::OnEvent { event, params };
    }

    // 阈值触发
    if cond.contains("≥") || cond.contains("＜") || cond.contains("<") || cond.contains(">") {
        let (stat, op, val) = if cond.contains("≥") {
            let parts: Vec<&str> = cond.split('≥').collect();
            let s = parts[0].trim().to_string();
            let v = parts.get(1).unwrap_or(&"").trim();
            let v = v.chars().filter(|c| c.is_ascii_digit()).collect::<String>().parse().unwrap_or(1);
            (s, "≥".to_string(), v)
        } else if cond.contains("＜") {
            let parts: Vec<&str> = cond.split('＜').collect();
            let s = parts[0].trim().to_string();
            let v = parts.get(1).unwrap_or(&"").trim();
            let v = v.chars().filter(|c| c.is_ascii_digit()).collect::<String>().parse().unwrap_or(1);
            (s, "＜".to_string(), v)
        } else {
            return TriggerCondition::None;
        };
        return TriggerCondition::Threshold { stat, operator: op, value: val };
    }

    // 状态判断
    if cond.starts_with("目标有") || cond.starts_with("目标无") || cond.starts_with("目标生命") || cond.starts_with("目标手牌") {
        return TriggerCondition::StateCheck {
            target: "目标".to_string(),
            condition: cond.to_string(),
        };
    }

    // 宣言
    if cond.starts_with("宣言") {
        let declared = cond[6..].trim().to_string();
        return TriggerCondition::Declare { what: "品质".to_string(), value: declared };
    }

    // 判定的后续条件
    if cond.contains("判定牌") {
        return TriggerCondition::JudgeResult {
            condition: "判定牌".to_string(),
            expected: cond.to_string(),
        };
    }

    // 累计条件
    if cond.starts_with("累计") {
        return TriggerCondition::Cumulative {
            tracked: "受伤".to_string(),
            operator: "≥".to_string(),
            value: 3,
        };
    }

    // 序数条件
    if let Some(rest) = cond.strip_prefix("每回合第") {
        if let Some(end) = rest.find('次') {
            if let Ok(n) = rest[..end].parse() {
                return TriggerCondition::Ordinal { nth: n, scope: "每回合".to_string() };
            }
        }
    }

    // 默认：事件触发
    TriggerCondition::OnEvent { event: cond.to_string(), params: vec![] }
}

/// 解析主语 → TargetSelector
fn parse_subject(subject: &str) -> TargetSelector {
    let s = subject.trim();
    match s {
        "自身" => TargetSelector::Self_,
        "目标" => TargetSelector::Target,
        "攻击者" => TargetSelector::Attacker,
        "伤害来源" => TargetSelector::DamageSource,
        s if s.contains("其他") => TargetSelector::AllOthers,
        _ => TargetSelector::Target,
    }
}

/// 解析谓语 → EffectType
fn parse_predicate(predicate: &str, object: &str, value: i32) -> Option<EffectType> {
    let p = predicate.trim();
    let obj = object.trim();

    match p {
        "造成" => {
            let dmg_type = if obj.contains("法术") {
                DamageType::Magical
            } else if obj.contains("真实") {
                DamageType::True
            } else {
                DamageType::Physical
            };
            Some(EffectType::DealDamage { amount: value, damage_type: dmg_type })
        }
        "恢复" => {
            if obj.contains("技力") {
                Some(EffectType::RestoreEnergy { amount: value })
            } else {
                Some(EffectType::Heal { amount: value })
            }
        }
        "获得" => {
            if obj.contains("护甲") {
                Some(EffectType::GainArmor { amount: value })
            } else if obj.contains("标记") || obj.contains("「") {
                let mark = extract_mark_name(obj);
                Some(EffectType::GainMark { mark_name: mark, count: value, max: None })
            } else if obj.contains("技力") {
                Some(EffectType::RestoreEnergy { amount: value })
            } else {
                Some(EffectType::IncreaseStat { stat: obj.to_string(), amount: value, permanent: false })
            }
        }
        "弃置" => Some(EffectType::Discard { count: value, quality: None }),
        "抽取" | "抽取并立即使用" => {
            let card_type = if obj.contains("构筑") { Some("构筑卡".to_string()) }
                           else if obj.contains("基本") { Some("基本牌".to_string()) }
                           else { None };
            Some(EffectType::Draw { count: value, card_type })
        }
        "免疫" => Some(EffectType::Immune { condition: obj.to_string() }),
        "消耗" => {
            if obj.contains("标记") || obj.contains("「") {
                let mark = extract_mark_name(obj);
                Some(EffectType::ConsumeMark { mark_name: mark, count: value })
            } else {
                Some(EffectType::Discard { count: value, quality: None })
            }
        }
        "放置" => {
            let mark = extract_mark_name(obj);
            Some(EffectType::GainMark { mark_name: mark, count: 1, max: None })
        }
        "移除" => {
            let what = if obj.contains("标记") { "标记" }
                       else if obj.contains("护甲") { "护甲" }
                       else { "技力" };
            Some(EffectType::Remove { target_what: what.to_string(), amount: value })
        }
        "判定" | "令目标判定" => Some(EffectType::JudgeCard),
        "锁定" => Some(EffectType::LockTargets { count: 2 }),
        "积累" => {
            let mark = extract_mark_name(obj);
            Some(EffectType::GainMark { mark_name: mark, count: value, max: None })
        }
        "补充" => {
            let resource = if obj.contains("谋略") { "谋略" } else { "资源" };
            Some(EffectType::Replenish { resource: resource.to_string(), amount: value })
        }
        "抵消" => Some(EffectType::CounterDamage { amount: value }),
        "增加" => {
            let stat = if obj.contains("法术") { "法术伤害" }
                       else if obj.contains("物理") { "物理伤害" }
                       else if obj.contains("上限") { "技力上限" }
                       else { "伤害" };
            let perm = obj.contains("永久");
            Some(EffectType::IncreaseStat { stat: stat.to_string(), amount: value, permanent: perm })
        }
        "降低" => {
            let stat = if obj.contains("上限") { "技力上限" } else { "技力" };
            Some(EffectType::DecreaseStat { stat: stat.to_string(), amount: value, permanent: obj.contains("永久") })
        }
        "扣除" => {
            let resource = if obj.contains("技力") { "技力" }
                           else if obj.contains("生命") { "生命" }
                           else { "护甲" };
            Some(EffectType::Deduct { resource: resource.to_string(), amount: value })
        }
        "赋予" => Some(EffectType::GrantArmor { amount: value }),
        "限制" => Some(EffectType::LimitDamage { max_per_hit: value }),
        "无效化" | "使目标的基本牌无效化" => {
            Some(EffectType::Nullify { target: obj.to_string() })
        }
        "封锁" | "封锁其他单位" => {
            let quality = if obj.contains("品质") { obj.to_string() } else { "低于紫色".to_string() };
            Some(EffectType::Seal { quality, duration: "下回合开始前".to_string() })
        }
        "重置" => Some(EffectType::ResetCooldown { skill_name: obj.to_string() }),
        "淘汰" => Some(EffectType::Eliminate),
        "视为" => Some(EffectType::TreatAs { card_name: obj.to_string() }),
        "存储" => {
            let mark = extract_mark_name(obj);
            Some(EffectType::StoreAsMark { mark_name: mark, max: 4 })
        }
        "重排" => {
            let count = obj.chars().filter(|c| c.is_ascii_digit()).collect::<String>().parse().unwrap_or(3);
            Some(EffectType::RearrangeTop { count })
        }
        "更换为" => Some(EffectType::ChangeIdentity { identity: obj.to_string() }),
        "执行" => {
            let tag = extract_tag_name(obj);
            Some(EffectType::ExecuteTag { tag_name: tag })
        }
        "强制使" => Some(EffectType::ForceEffect { description: obj.to_string() }),
        "强制目标弃置" => {
            let quality = if obj.contains("白") { Some("白色".to_string()) }
                          else if obj.contains("宣言") { Some("宣言品质".to_string()) }
                          else { None };
            Some(EffectType::Discard { count: 1, quality })
        }
        "翻牌堆顶" => Some(EffectType::FlipJudge { description: obj.to_string() }),
        "复制" => Some(EffectType::CopyEffect { description: obj.to_string() }),
        "选择保留" => Some(EffectType::SelectKeep { keep: value, from: value * 2 }),
        "放回" => Some(EffectType::ReturnToDeck { description: obj.to_string() }),
        "对伤害来源使用" | "对1单位造成" | "额外造成" => {
            let dmg_type = if obj.contains("法术") { DamageType::Magical } else { DamageType::Physical };
            Some(EffectType::DealDamage { amount: value, damage_type: dmg_type })
        }
        "可将本卡叠放至" => Some(EffectType::ChangeIdentity { identity: "技能栏".to_string() }),
        "将攻击视为" => {
            let dt = if obj.contains("法术") { DamageType::Magical } else { DamageType::Physical };
            Some(EffectType::ConvertDamage { to_type: dt })
        }
        "额外获得" => {
            if obj.contains("攻击次数") {
                Some(EffectType::GainExtraAttack { count: 1 })
            } else if obj.contains("标记") {
                let mark = extract_mark_name(obj);
                Some(EffectType::GainMark { mark_name: mark, count: 1, max: None })
            } else {
                Some(EffectType::IncreaseStat { stat: obj.to_string(), amount: 1, permanent: false })
            }
        }
        "额外抽取" => Some(EffectType::Draw { count: value, card_type: None }),
        "额外扣除" => Some(EffectType::Deduct { resource: "技力".to_string(), amount: value }),
        "额外附加" => Some(EffectType::DealDamage { amount: value, damage_type: DamageType::True }),
        "转化伤害类型为" => {
            let dt = if obj.contains("真实") { DamageType::True } else { DamageType::Physical };
            Some(EffectType::ConvertDamage { to_type: dt })
        }
        "附加" => {
            let dt = if obj.contains("真实") { DamageType::True } else { DamageType::Physical };
            Some(EffectType::BonusDamage { amount: value, damage_type: dt })
        }
        "使目标进入" => Some(EffectType::SetNearDeath),
        "可移除目标" => Some(EffectType::Remove { target_what: "标记".to_string(), amount: 1 }),
        "使本次物理伤害翻倍" | "进行" | "令目标出示" | "强制目标在自身回合开始时" | "抽取并公示目标" | "强制目标" => {
            // 复杂嵌套效果，标记为 ForceEffect
            Some(EffectType::ForceEffect { description: format!("{} → {}", p, obj) })
        }
        "持续抽牌至手牌数等于" => {
            Some(EffectType::DrawToMatch { target_side: PlayerSide::Second })
        }
        "再抽取" => Some(EffectType::Draw { count: 1, card_type: None }),
        "减少" => Some(EffectType::CounterDamage { amount: value }),
        "弃置本甲胄并清空所有技力和护甲" => {
            Some(EffectType::ForceEffect { description: "弃置甲胄清空技力护甲".to_string() })
        }
        // 兜底
        _ => {
            // 尝试通用解析
            if p.contains("造成") {
                Some(EffectType::DealDamage { amount: value, damage_type: DamageType::Physical })
            } else if p.contains("获得") {
                Some(EffectType::IncreaseStat { stat: obj.to_string(), amount: value, permanent: false })
            } else if p.contains("恢复") {
                Some(EffectType::Heal { amount: value })
            } else {
                // 最后兜底为 ForceEffect
                Some(EffectType::ForceEffect { description: format!("{} → {}", p, obj) })
            }
        }
    }
}

/// 从宾语中提取标记名
fn extract_mark_name(obj: &str) -> String {
    if let Some(start) = obj.find('「') {
        if let Some(end) = obj[start+3..].find('」') {
            return obj[start+3..start+3+end].to_string();
        }
    }
    if obj.contains("仁心") { return "仁心".to_string(); }
    if obj.contains("自然") { return "自然".to_string(); }
    if obj.contains("法令") { return "法令".to_string(); }
    if obj.contains("坚守") { return "坚守".to_string(); }
    if obj.contains("谋略") { return "谋略".to_string(); }
    if obj.contains("零件") { return "零件".to_string(); }
    if obj.contains("蓄力") { return "蓄力".to_string(); }
    if obj.contains("材料") { return "材料".to_string(); }
    if obj.contains("噬魂") { return "噬魂".to_string(); }
    "标记".to_string()
}

/// 从宾语中提取标签名
fn extract_tag_name(obj: &str) -> String {
    if let Some(start) = obj.find('[') {
        if let Some(end) = obj[start+1..].find(']') {
            return obj[start+1..start+1+end].to_string();
        }
    }
    obj.to_string()
}

// ============ 测试 ============

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_from_entry_damage() {
        let entry = CardEntry {
            id: "1".into(),
            condition: "消耗1技力".into(),
            subject: "自身".into(),
            predicate: "造成".into(),
            object: "目标1点物理伤害".into(),
            note: "—".into(),
        };
        let effect = Effect::from_entry(&entry, "斥候").unwrap();
        assert_eq!(effect.effect_type, EffectType::DealDamage { amount: 1, damage_type: DamageType::Physical });
        assert_eq!(effect.target, TargetSelector::Self_);
        assert!(matches!(effect.trigger, TriggerCondition::Cost { .. }));
    }

    #[test]
    fn test_from_entry_heal() {
        let entry = CardEntry {
            id: "1".into(),
            condition: "消耗2技力".into(),
            subject: "自身".into(),
            predicate: "恢复".into(),
            object: "目标2点生命".into(),
            note: "—".into(),
        };
        let effect = Effect::from_entry(&entry, "医师").unwrap();
        assert_eq!(effect.effect_type, EffectType::Heal { amount: 2 });
    }

    #[test]
    fn test_from_entry_gain_mark() {
        let entry = CardEntry {
            id: "1".into(),
            condition: "获得白/紫基本牌时".into(),
            subject: "自身".into(),
            predicate: "积累".into(),
            object: "1个「仁心」标记".into(),
            note: "每回合最多3个".into(),
        };
        let effect = Effect::from_entry(&entry, "儒家").unwrap();
        assert_eq!(effect.effect_type, EffectType::GainMark {
            mark_name: "仁心".to_string(),
            count: 1,
            max: None,
        });
    }

    #[test]
    fn test_from_entry_execute_tag() {
        let entry = CardEntry {
            id: "1".into(),
            condition: "攻击时".into(),
            subject: "自身".into(),
            predicate: "执行".into(),
            object: "[一槌定音]".into(),
            note: "—".into(),
        };
        let effect = Effect::from_entry(&entry, "指虎").unwrap();
        assert_eq!(effect.effect_type, EffectType::ExecuteTag { tag_name: "一槌定音".to_string() });
    }

    #[test]
    fn test_parse_condition_cost() {
        let cond = parse_condition("消耗2技力", "");
        assert!(matches!(cond, TriggerCondition::Cost { ref resource, amount: 2, .. } if resource == "技力"));
    }

    #[test]
    fn test_parse_condition_event() {
        let cond = parse_condition("受到伤害时", "");
        assert!(matches!(cond, TriggerCondition::OnEvent { .. }));
    }
}
