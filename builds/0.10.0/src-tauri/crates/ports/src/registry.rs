//! DZ CardMaker — 模块注册表
//!
//! 应用启动时唯一知道"谁实现谁"的地方。
//! 其他所有代码只看到 trait，不知道实现方的存在。

use std::any::{Any, TypeId};
use std::collections::HashMap;

pub struct ModuleRegistry {
    entries: HashMap<TypeId, Box<dyn Any + Send + Sync>>,
}

impl ModuleRegistry {
    pub fn new() -> Self {
        Self {
            entries: HashMap::new(),
        }
    }

    pub fn register<T: 'static + Send + Sync>(&mut self, service: T) {
        self.entries
            .insert(TypeId::of::<T>(), Box::new(service));
    }

    pub fn get<T: 'static>(&self) -> Option<&T> {
        self.entries
            .get(&TypeId::of::<T>())
            .and_then(|boxed| boxed.downcast_ref::<T>())
    }
}

impl Default for ModuleRegistry {
    fn default() -> Self {
        Self::new()
    }
}
