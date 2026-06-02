//! 内建标记注册表 — 原始套 9 种标记

use std::collections::HashMap;
use dz_cardmaker_ports::*;

pub struct BundledMarkRegistry {
    marks: HashMap<MarkId, String>,
}

impl BundledMarkRegistry {
    pub fn new() -> Self {
        let mut marks = HashMap::new();

        marks.insert(MarkId("仁心".into()), "累计消耗型".into());
        marks.insert(MarkId("自然".into()), "累计消耗型".into());
        marks.insert(MarkId("法令".into()), "累计阈值型".into());
        marks.insert(MarkId("坚守".into()), "层数阈值型".into());
        marks.insert(MarkId("谋略".into()), "累计消耗型".into());
        marks.insert(MarkId("零件".into()), "累计消耗型".into());
        marks.insert(MarkId("蓄力".into()), "存储释放型".into());
        marks.insert(MarkId("材料".into()), "回合获取型".into());
        marks.insert(MarkId("噬魂".into()), "叠加引爆型".into());

        Self { marks }
    }
}

impl MarkRegistryPort for BundledMarkRegistry {
    fn list_all(&self) -> Vec<MarkId> {
        self.marks.keys().cloned().collect()
    }

    fn get_type(&self, id: &MarkId) -> Option<String> {
        self.marks.get(id).cloned()
    }

    fn is_valid(&self, id: &MarkId) -> bool {
        self.marks.contains_key(id)
    }
}

impl Default for BundledMarkRegistry {
    fn default() -> Self {
        Self::new()
    }
}
