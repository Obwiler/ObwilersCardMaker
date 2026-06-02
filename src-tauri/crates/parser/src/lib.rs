pub use core;

pub mod lexer;
pub mod parser;
pub mod card_data;
pub mod validator;
pub mod data_gov;

use card_data::{Card, load_all_cards, card_stats, create_card, update_card, delete_card, get_card, save_cards, load_cards, save_cards_auto};
use data_gov::{validate_cards_json, validate_current_cards, detect_duplicates, export_cards, import_cards};
use parser::ParseResult;
use validator::{CardValidation, validate_all};
use serde::{Deserialize, Serialize};

pub fn parse_card(name: String, text: String) -> ParseResult {
    parser::parse_card_text(&name, &text)
}

pub fn parse_all_cards() -> Vec<Card> {
    load_all_cards()
}

pub fn validate_all_cards() -> Vec<CardValidation> {
    let cards = load_all_cards();
    validate_all(&cards)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParseStats {
    pub total: usize,
    pub parsed: usize,
    pub failed: usize,
}

pub fn parse_stats() -> ParseStats {
    let cards = load_all_cards();
    let (total, parsed, failed) = card_stats(&cards);
    ParseStats { total, parsed, failed }
}

// ============ CRUD ============

pub fn do_create_card(name: String, tags: Vec<String>, text: String) -> Result<Card, String> {
    create_card(name, tags, text)
}

pub fn do_update_card(id: String, name: Option<String>, tags: Option<Vec<String>>, text: Option<String>) -> Result<Card, String> {
    update_card(&id, name, tags, text)
}

pub fn do_delete_card(id: String) -> Result<bool, String> {
    delete_card(&id)
}

pub fn do_get_card(id: String) -> Option<Card> {
    get_card(&id)
}

pub fn do_save_cards(data_dir: Option<String>) -> Result<usize, String> {
    match data_dir {
        Some(d) => save_cards(&d),
        None => save_cards_auto(),
    }
}

pub fn do_load_cards(data_dir: String) -> Result<Vec<Card>, String> {
    load_cards(&data_dir)
}

// ============ 数据治理 ============

pub use data_gov::{JsonValidationResult, JsonValidationError, DuplicatePair, ImportResult};

pub fn do_validate_cards_json(json_str: String) -> JsonValidationResult {
    validate_cards_json(&json_str)
}

pub fn do_validate_current_cards() -> JsonValidationResult {
    validate_current_cards()
}

pub fn do_detect_duplicates() -> Vec<DuplicatePair> {
    detect_duplicates()
}

pub fn do_export_cards(ids: Vec<String>) -> Result<String, String> {
    export_cards(&ids)
}

pub fn do_import_cards(json_str: String) -> Result<ImportResult, String> {
    import_cards(&json_str)
}
