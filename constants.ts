import dotenv from "dotenv"
import { join, resolve } from "path"
dotenv.config({ path: resolve(__dirname, "..", "..", ".env") })

export const ROOT_DIR = __dirname
export const SRC_DIR_NAME = "src"
const LEGACY_SRC_DIR_NAME = join(SRC_DIR_NAME, "legacy")

export const COVERAGE_URL = "http://127.0.0.1:8555"
export const LOCALHOST_URL = "http://127.0.0.1:8545"
export const ARTIFACTS_DIR = "./build/contracts"
export const GAS = 8000000
export const GAS_PRICE = 2_000_000_000
export const SRC_DIR = join(ROOT_DIR, SRC_DIR_NAME)
export const LEGACY_SRC_DIR = join(ROOT_DIR, LEGACY_SRC_DIR_NAME)
export const ETHERSCAN_API_KEY = process.env["POLYSCAN_API_KEY"] || ""
export const MUMBAI_MNEMONIC = process.env["MUMBAI_MNEMONIC"] || ""
export const MUMBAI_URL = process.env["MUMBAI_URL"] || ""
export const POLYGONPoS_MNEMONIC = process.env["POLYGONPoS_MNEMONIC"] || ""
export const POLYGONPoS_URL = process.env["POLYGONPoS_URL"] || ""
export const ALFAJORES_MNEMONIC = process.env["ALFAJORES_MNEMONIC"] || ""
export const ALFAJORES_URL = process.env["ALFAJORES_URL"] || ""
