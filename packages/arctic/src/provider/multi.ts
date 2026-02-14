import { Auth } from "../auth"
import { Config } from "../config/config"
import { Log } from "../util/log"

const log = Log.create({ service: "multi-account" })

export namespace MultiAccount {
  const cursor = new Map<string, number>()
  // Track which providers have been initialized (either by manual selection or rotation)
  const initialized = new Set<string>()

  async function getAccounts(baseProvider: string): Promise<string[]> {
    const connections = await Auth.listConnections(baseProvider)
    const accounts = connections.filter((c) => c.connection).map((c) => c.key)

    const hasBaseOnly = connections.length === 1 && !connections[0].connection
    if (hasBaseOnly) return [baseProvider]

    const result: string[] = []
    if (connections.some((c) => !c.connection)) {
      result.push(baseProvider)
    }
    result.push(...accounts)

    log.debug("getAccounts", {
      baseProvider,
      connectionsCount: connections.length,
      accountsCount: result.length,
      accounts: result,
    })

    return result
  }

  function isConnection(providerID: string): boolean {
    return providerID.includes(":")
  }

  function getBaseProvider(providerID: string): string {
    return providerID.split(":")[0]
  }

  function getAccountName(providerID: string): string {
    const parsed = Auth.parseKey(providerID)
    return parsed.connection ?? "primary"
  }

  // Get effective mode - defaults to fill-first if not configured
  export async function getMode(): Promise<"fill-first" | "round-robin"> {
    const config = await Config.get()
    return config.multi_account?.mode ?? "fill-first"
  }

  // Check if multi-account is explicitly disabled (mode set to something falsy)
  export async function isDisabled(): Promise<boolean> {
    const config = await Config.get()
    return config.multi_account?.mode === undefined ? false : false
  }

  export async function getCurrent(providerID: string): Promise<string> {
    const baseProvider = isConnection(providerID) ? getBaseProvider(providerID) : providerID
    const accounts = await getAccounts(baseProvider)

    if (accounts.length <= 1) return providerID

    // If already initialized (rotation happened or manual selection was already applied),
    // use the cursor
    if (initialized.has(baseProvider)) {
      const idx = cursor.get(baseProvider) ?? 0
      const result = accounts[idx] ?? providerID
      log.debug("getCurrent: using cursor", { baseProvider, cursor: idx, result })
      return result
    }

    // First call: If user manually selected a specific connection, initialize cursor to it
    if (isConnection(providerID)) {
      const accountIndex = accounts.indexOf(providerID)
      if (accountIndex !== -1) {
        cursor.set(baseProvider, accountIndex)
        initialized.add(baseProvider)
        log.debug("getCurrent: initialized from manual selection", {
          baseProvider,
          cursor: accountIndex,
          providerID,
        })
        return providerID
      }
    }

    // Initialize cursor to 0 (primary account)
    if (!cursor.has(baseProvider)) {
      cursor.set(baseProvider, 0)
    }
    initialized.add(baseProvider)

    const idx = cursor.get(baseProvider)!
    const result = accounts[idx] ?? providerID
    log.debug("getCurrent: initialized to default", { baseProvider, cursor: idx, result })
    return result
  }

  export async function getAccountDisplayName(providerID: string): Promise<string | undefined> {
    const baseProvider = isConnection(providerID) ? getBaseProvider(providerID) : providerID
    const accounts = await getAccounts(baseProvider)

    if (accounts.length <= 1) return undefined

    const current = await getCurrent(providerID)
    return getAccountName(current)
  }

  export async function hasMultiple(providerID: string): Promise<boolean> {
    const baseProvider = isConnection(providerID) ? getBaseProvider(providerID) : providerID
    const accounts = await getAccounts(baseProvider)

    return accounts.length > 1
  }

  export interface SwitchResult {
    from: string
    to: string
  }

  export async function rotate(providerID: string): Promise<SwitchResult | undefined> {
    const mode = await getMode()
    if (mode !== "round-robin") {
      log.debug("rotate skipped", { mode, providerID })
      return undefined
    }

    const baseProvider = isConnection(providerID) ? getBaseProvider(providerID) : providerID
    const accounts = await getAccounts(baseProvider)

    log.debug("rotate check", { baseProvider, accountsCount: accounts.length, accounts })

    if (accounts.length <= 1) return undefined

    const current = cursor.get(baseProvider) ?? 0
    const next = (current + 1) % accounts.length
    cursor.set(baseProvider, next)
    initialized.add(baseProvider) // Mark as initialized so getCurrent doesn't reset

    const result = {
      from: getAccountName(accounts[current]),
      to: getAccountName(accounts[next]),
    }

    log.info("rotated", { baseProvider, from: result.from, to: result.to, cursor: next })

    return result
  }

  export async function switchNext(providerID: string): Promise<SwitchResult | undefined> {
    const mode = await getMode()
    if (mode !== "fill-first") return undefined

    const baseProvider = isConnection(providerID) ? getBaseProvider(providerID) : providerID
    const accounts = await getAccounts(baseProvider)

    if (accounts.length <= 1) return undefined

    const current = cursor.get(baseProvider) ?? 0
    const next = (current + 1) % accounts.length

    if (next === 0) return undefined

    cursor.set(baseProvider, next)
    initialized.add(baseProvider) // Mark as initialized so getCurrent doesn't reset

    return {
      from: getAccountName(accounts[current]),
      to: getAccountName(accounts[next]),
    }
  }

  export async function getNextProvider(providerID: string): Promise<string | undefined> {
    const baseProvider = isConnection(providerID) ? getBaseProvider(providerID) : providerID
    const accounts = await getAccounts(baseProvider)

    if (accounts.length <= 1) return undefined

    const current = cursor.get(baseProvider) ?? 0
    return accounts[current]
  }
}
