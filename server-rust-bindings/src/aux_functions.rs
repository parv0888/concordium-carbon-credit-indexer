use crate::types::*;
use anyhow::{anyhow, Result};
use concordium_base::contracts_common::{schema::VersionedModuleSchema, Cursor};
use hex;

/// Given the bytes of a receive function's return value, deserialize them to a
/// json object, using the provided schema.
pub fn deserialize_event_aux(
    event_bytes: HexString,
    schema: HexString,
    contract_name: &str,
    schema_version: Option<u8>,
) -> Result<JsonString> {
    let module_schema = VersionedModuleSchema::new(&hex::decode(schema)?, &schema_version)?;
    let event_schema = match module_schema {
        VersionedModuleSchema::V0(_) => Err(anyhow!("only v3 module is supported")),
        VersionedModuleSchema::V1(_) => Err(anyhow!("only v3 module is supported")),
        VersionedModuleSchema::V2(_) => Err(anyhow!("only v3 module is supported")),
        VersionedModuleSchema::V3(module_v3) => Ok(module_v3
            .contracts
            .get(contract_name)
            .and_then(|contract| contract.event.clone())
            .ok_or_else(|| anyhow!("Event schema not present"))),
    }??;
    let mut rv_cursor = Cursor::new(hex::decode(event_bytes)?);
    match event_schema.to_json(&mut rv_cursor) {
        Ok(rv) => Ok(rv.to_string()),
        Err(_) => Err(anyhow!("Unable to parse return value to json.")),
    }
}
