use std::collections::HashMap;
use std::sync::LazyLock;

use super::types::{Mark, SkillEntry, Tag};

/// 15 个标签的内嵌只读字典，key 为 tag_id
pub static TAGS: LazyLock<HashMap<String, Tag>> = LazyLock::new(|| {
    let tags = vec![
        Tag {
            tag_id: "tag_01".into(),
            name: "韬光养晦".into(),
            skill_entries: vec![SkillEntry {
                level: "A".into(),
                description: "消耗 X 张 Y 品质牌 → 免疫 Z 效果，成功规避后抽 1 牌".into(),
            }],
            first_appearance: "浮光（构筑卡·武学）".into(),
            design_intent: "以手牌为替代支付代价换取伤害免疫，体现「弃卒保车」的资源置换策略"
                .into(),
        },
        Tag {
            tag_id: "tag_02".into(),
            name: "一槌定音".into(),
            skill_entries: vec![SkillEntry {
                level: "A".into(),
                description: "翻牌堆顶 1 张判定牌 → 若满足条件 X 则执行 Y，否则执行 Z".into(),
            }],
            first_appearance: "指虎（构筑卡·兵刃）".into(),
            design_intent: "引入随机性验证的条件分支，令攻防结算存在变数，增加博弈深度".into(),
        },
        Tag {
            tag_id: "tag_03".into(),
            name: "谋定后动".into(),
            skill_entries: vec![SkillEntry {
                level: "A".into(),
                description: "从 N 个互斥选项中择一执行".into(),
            }],
            first_appearance: "蓄势（基本牌·蓝）".into(),
            design_intent: "给予使用者一次性多选一决策权，覆盖伤害/治疗/护甲多维度，体现战术灵活性"
                .into(),
        },
        Tag {
            tag_id: "tag_04".into(),
            name: "点石成金".into(),
            skill_entries: vec![SkillEntry {
                level: "A".into(),
                description: "积累标记（上限 X）→ 消耗标记 + 附加资源 → 产出 Y 效果（每种每回合限 1 次）"
                    .into(),
            }],
            first_appearance: "药师（职业卡）".into(),
            design_intent: "以通用标记为纽带的多输出转化链路，同一标记搭配不同成本产出不同效果，体现「有限选择」"
                .into(),
        },
        Tag {
            tag_id: "tag_05".into(),
            name: "定向搜寻".into(),
            skill_entries: vec![SkillEntry {
                level: "A".into(),
                description: "从牌堆抽取指定类型牌 N 张 → 保留 M 张 → 其余弃置或放回".into(),
            }],
            first_appearance: "整军（基本牌·蓝）".into(),
            design_intent: "定向从牌堆检索特定类型卡牌并择优保留，提升关键卡上手率".into(),
        },
        Tag {
            tag_id: "tag_06".into(),
            name: "藏锋蓄锐".into(),
            skill_entries: vec![SkillEntry {
                level: "A".into(),
                description: "将牌存为标记于指定位置（上限 X，每回合限 N 次）→ 条件 Y 触发 → 消耗标记产生效果 Z"
                    .into(),
            }],
            first_appearance: "光铸（构筑卡·甲胄）".into(),
            design_intent: "将手牌转化为延迟触发的待发标记，以「蓄而不发」换取时机优势".into(),
        },
        Tag {
            tag_id: "tag_07".into(),
            name: "传檄征召".into(),
            skill_entries: vec![SkillEntry {
                level: "A".into(),
                description: "选择目标玩家 → 抽取公示其 1 张手牌 → 强制其下回合使用该牌".into(),
            }],
            first_appearance: "传令（基本牌·紫）".into(),
            design_intent: "跨回合强制调度对手手牌，打乱节奏同时暴露信息，兼具干扰与情报价值".into(),
        },
        Tag {
            tag_id: "tag_08".into(),
            name: "以形摹意".into(),
            skill_entries: vec![SkillEntry {
                level: "A".into(),
                description: "复制本回合上一张非橙卡效果 → 若无可复制对象则兜底为 X 效果，使用后额外获 1 技力"
                    .into(),
            }],
            first_appearance: "仿技（基本牌·橙）".into(),
            design_intent: "灵活的镜像效果，以已用卡牌为模板复制执行，并提供空场兜底确保永远可用".into(),
        },
        Tag {
            tag_id: "tag_09".into(),
            name: "追影逐风".into(),
            skill_entries: vec![SkillEntry {
                level: "A".into(),
                description: "指定目标手牌数为基准 N → 持续抽牌至手牌数等于 N → 若 N=0 则改执行 Z"
                    .into(),
            }],
            first_appearance: "掠影（构筑卡·武学）".into(),
            design_intent: "以对手手牌数为参照的追赶式抽牌，追平信息差或空手时触发替代效果".into(),
        },
        Tag {
            tag_id: "tag_10".into(),
            name: "牵脉连心".into(),
            skill_entries: vec![SkillEntry {
                level: "A".into(),
                description: "锁定两个单位 → 下次对任一单位生效的效果同时作用于另一单位".into(),
            }],
            first_appearance: "连脉术（构筑卡·术法）".into(),
            design_intent: "建立两单位命运链接，令下一次效果「一石二鸟」，链接用后即解除".into(),
        },
        Tag {
            tag_id: "tag_11".into(),
            name: "洞幽察微".into(),
            skill_entries: vec![SkillEntry {
                level: "A".into(),
                description: "查看并重排牌堆顶 N 张牌 → 然后抽取 1 张".into(),
            }],
            first_appearance: "观微术（构筑卡·术法）".into(),
            design_intent: "窥探牌堆顶信息并重新排序后再抽牌，兼顾当前抽牌质量与后续回合布局".into(),
        },
        Tag {
            tag_id: "tag_12".into(),
            name: "弃旧图新".into(),
            skill_entries: vec![SkillEntry {
                level: "A".into(),
                description: "弃置手牌 → 换取战略资源 X（每回合限 N 次）".into(),
            }],
            first_appearance: "兵家·权变（重铸子效果，阵营核心技能）".into(),
            design_intent: "以牺牲手牌为代价换取可积累的战略资本，非直接规避伤害而是长线投资".into(),
        },
        Tag {
            tag_id: "tag_13".into(),
            name: "崩山裂石".into(),
            skill_entries: vec![SkillEntry {
                level: "A".into(),
                description: "消耗某项资源当前值的一半（取整）→ 产生效果量与消耗量正相关".into(),
            }],
            first_appearance: "崩山（构筑卡·武学）".into(),
            design_intent: "以资源当前值的半数为动态成本，资源越充沛效果越强，形成自平衡".into(),
        },
        Tag {
            tag_id: "tag_14".into(),
            name: "先损后利".into(),
            skill_entries: vec![SkillEntry {
                level: "A".into(),
                description: "消耗 X 点生命 → 换取效果 Y（伤害或资源）".into(),
            }],
            first_appearance: "七伤（构筑卡·武学）".into(),
            design_intent: "以生命为直接交易成本的高风险高回报转换，体现「伤人先伤己」的狠厉".into(),
        },
        Tag {
            tag_id: "tag_15".into(),
            name: "荆棘反刺".into(),
            skill_entries: vec![SkillEntry {
                level: "A".into(),
                description: "受伤害后 → 对伤害来源执行反制效果 X".into(),
            }],
            first_appearance: "荆棘（构筑卡·甲胄）".into(),
            design_intent: "以受伤为触发的被动反击，不阻止伤害但结算后惩罚攻击者，形成「以牙还牙」威慑"
                .into(),
        },
    ];

    let mut map = HashMap::with_capacity(tags.len());
    for tag in tags {
        map.insert(tag.tag_id.clone(), tag);
    }
    map
});

/// 9 个标记的内嵌数据
pub static MARKS: LazyLock<Vec<Mark>> = LazyLock::new(|| {
    vec![
        Mark { mark_id: "mark_01".into(), name: "鸣金".into() },
        Mark { mark_id: "mark_02".into(), name: "纳灵".into() },
        Mark { mark_id: "mark_03".into(), name: "魂印".into() },
        Mark { mark_id: "mark_04".into(), name: "罅隙".into() },
        Mark { mark_id: "mark_05".into(), name: "铁甲".into() },
        Mark { mark_id: "mark_06".into(), name: "聚变".into() },
        Mark { mark_id: "mark_07".into(), name: "裂变".into() },
        Mark { mark_id: "mark_08".into(), name: "蛰伏".into() },
        Mark { mark_id: "mark_09".into(), name: "虚形".into() },
    ]
});
