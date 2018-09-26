import simulant from 'simulant'
import EventTarget from './EventTarget'

describe('EventTarget', () => {
  let target

  beforeEach(() => {
    target = new EventTarget(document)
  })

  afterEach(() => {
    target = null
  })

  describe('addHandlers', () => {
    it('adds handlers', () => {
      const handler1 = jasmine.createSpy()
      const handler2 = jasmine.createSpy()

      target.addHandlers('default', 'click', [handler1])
      target.addHandlers('default', 'click', [handler2])
      simulant.fire(document, 'click')

      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
    })

    it('handles multiple pools', () => {
      const handler1 = jasmine.createSpy()
      const handler2 = jasmine.createSpy()

      target.addHandlers('default', 'click', [handler1])
      target.addHandlers('another', 'click', [handler2])
      simulant.fire(document, 'click')

      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
    })
  })

  describe('hasHandlers', () => {
    it('is "false" when has not handlers', () => {
      expect(target.hasHandlers()).toBeFalsy()
    })

    it('is "true" when has handlers', () => {
      target.addHandlers('default', 'click', [jasmine.createSpy()])
      expect(target.hasHandlers()).toBeTruthy()
    })
  })

  describe('removeHandlers', () => {
    it('removes handlers', () => {
      const handler1 = jasmine.createSpy()
      const handler2 = jasmine.createSpy()

      target.addHandlers('default', 'click', [handler1, handler2])
      simulant.fire(document, 'click')

      target.removeHandlers('default', 'click', [handler2])
      simulant.fire(document, 'click')

      expect(handler1).toHaveBeenCalledTimes(2)
      expect(handler2).toHaveBeenCalledTimes(1)
    })

    it('removes handlers with multiple pools', () => {
      const handler1 = jasmine.createSpy()
      const handler2 = jasmine.createSpy()

      target.addHandlers('default', 'click', [handler1])
      target.addHandlers('another', 'click', [handler2])
      simulant.fire(document, 'click')

      target.removeHandlers('another', 'click', [handler2])
      simulant.fire(document, 'click')

      expect(handler1).toHaveBeenCalledTimes(2)
      expect(handler2).toHaveBeenCalledTimes(1)
    })
  })
})
