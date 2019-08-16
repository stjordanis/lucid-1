/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/database.ts" />

import { Exception } from '@poppinss/utils'
import { LoggerContract } from '@poppinss/logger'

import {
  ConnectionManagerContract,
  DatabaseConfigContract,
  DatabaseContract,
} from '@ioc:Adonis/Addons/Database'

import { ConnectionManager } from '../Connection/Manager'

/**
 * Database class exposes the API to manage multiple connections and obtain an instance
 * of query/transaction clients.
 */
export class Database implements DatabaseContract {
  /**
   * Reference to connections manager
   */
  public manager: ConnectionManagerContract

  /**
   * Primary connection name
   */
  public primaryConnectionName = this._config.connection

  constructor (private _config: DatabaseConfigContract, private _logger: LoggerContract) {
    this.manager = new ConnectionManager(this._logger)
    this._registerConnections()
  }

  /**
   * Registering all connections with the manager, so that we can fetch
   * and connect with them whenver required.
   */
  private _registerConnections () {
    Object.keys(this._config.connections).forEach((name) => {
      this.manager.add(name, this._config.connections[name])
    })
  }

  /**
   * Returns the connection node from the connection manager
   */
  public getRawConnection (name) {
    return this.manager.get(name)
  }

  /**
   * Returns the query client for a given connection
   */
  public connection (connection: string = this.primaryConnectionName) {
    const [name, mode] = connection.split('::')

    /**
     * Connect is noop when already connected
     */
    this.manager.connect(name)

    /**
     * Disallow modes other than `read` or `write`
     */
    if (mode && !['read', 'write'].includes(mode)) {
      throw new Exception(`Invalid mode ${mode}. Must be read or write`)
    }

    const rawConnection = this.manager.get(name)!.connection!
    return mode ? rawConnection.getClient(mode as ('read' | 'write')) : rawConnection.getClient()
  }

  /**
   * Returns query builder. Optionally one can define the mode as well
   */
  public query (mode?: 'read' | 'write') {
    return mode
      ? this.connection(`${this.primaryConnectionName}::${mode}`).query()
      : this.connection().query()
  }

  /**
   * Returns insert query builder. Always has to be dual or write mode and
   * hence it doesn't matter, since in both `dual` and `write` mode,
   * the `write` connection is always used.
   */
  public insertQuery () {
    return this.connection().insertQuery()
  }

  /**
   * Returns instance of a query builder and selects the table
   */
  public from (table: any) {
    return this.connection().from(table)
  }

  /**
   * Returns insert query builder and selects the table
   */
  public table (table: any) {
    return this.connection().table(table)
  }

  /**
   * Returns a transaction instance on the default
   * connection
   */
  public transaction () {
    return this.connection().transaction()
  }

  /**
   * Returns an instance of raw query builder. Optionally one can
   * defined the `read/write` mode in which to execute the
   * query
   */
  public raw (sql: string, bindings?: any, mode?: 'read' | 'write') {
    return mode
      ? this.connection(`${this.primaryConnectionName}::${mode}`).raw(sql, bindings)
      : this.connection().raw(sql, bindings)
  }
}
