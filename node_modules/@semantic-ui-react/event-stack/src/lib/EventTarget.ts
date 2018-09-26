import EventPool from './EventPool'
import { EventListeners, TargetElement } from '../types'

export default class EventTarget {
  private readonly handlers: Map<String, Function> = new Map()
  private readonly pools: Map<String, EventPool> = new Map()
  private readonly target: TargetElement

  public constructor(target: TargetElement) {
    this.target = target
  }

  public addHandlers(poolName: string, eventType: string, eventHandlers: EventListeners) {
    this.removeTargetHandler(eventType)

    if (this.pools.has(poolName)) {
      const eventPool = this.pools.get(poolName) as EventPool

      this.pools.set(poolName, eventPool.addHandlers(eventType, eventHandlers))
    } else {
      this.pools.set(poolName, EventPool.createByType(poolName, eventType, eventHandlers))
    }

    this.addTargetHandler(eventType)
  }

  hasHandlers(): boolean {
    return this.handlers.size > 0
  }

  removeHandlers(poolName: string, eventType: string, eventHandlers: EventListeners) {
    if (!this.pools.has(poolName)) {
      return
    }

    const pool = this.pools.get(poolName) as EventPool
    const newPool = pool.removeHandlers(eventType, eventHandlers)

    if (newPool.hasHandlers()) {
      this.pools.set(poolName, newPool)
    } else {
      this.pools.delete(poolName)
    }

    this.removeTargetHandler(eventType)

    if (this.pools.size > 0) {
      this.addTargetHandler(eventType)
    }
  }

  private createEmitter = (
    eventType: string,
    eventPools: Map<String, EventPool>,
  ): EventListener => {
    return (event: Event) => {
      eventPools.forEach(pool => {
        pool.dispatchEvent(eventType, event)
      })
    }
  }

  private addTargetHandler(eventType: string) {
    const handler = this.createEmitter(eventType, this.pools)

    this.handlers.set(eventType, handler)
    this.target.addEventListener(eventType, handler)
  }

  private removeTargetHandler(eventType: string) {
    if (this.handlers.has(eventType)) {
      this.target.removeEventListener(eventType, this.handlers.get(eventType) as EventListener)
      this.handlers.delete(eventType)
    }
  }
}
