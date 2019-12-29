import { Red, Node, NodeProperties } from 'node-red';

interface TimeBasedDimmerConfig extends NodeProperties {
  interval: number
  step: number
  maxValue: number
  minValue: number
  startIncCommand: string
  startDecCommand: string
  stopIncCommand: string
  stopDecCommand: string
}

module.exports = function(red: Red): void {
  class TimeBasedDimmerNode {
    tick(send: Function, node: Node) {
      let newValue: number
      const oldValue = node.context().get('value') || 0
      if (node.context().get('mode') === 'inc') {
        newValue = oldValue + this.config.step
        if (newValue > this.config.maxValue) {
          clearInterval(node.context().get('timer'));
          node.context().set('timer', null)
          newValue = this.config.maxValue;
        }
      } else {
        newValue = oldValue - this.config.step
        if (newValue < this.config.minValue) {
          clearInterval(node.context().get('timer'));
          node.context().set('timer', null)
          newValue = this.config.minValue;
        }
      }
      if (node.context().get('value') === newValue) return
      node.status({ fill:"grey", shape:"dot", text: newValue.toString() });
      node.context().set('value', newValue)
      send({ payload: newValue })
    }
    
    constructor(private config: TimeBasedDimmerConfig) {
      red.nodes.createNode(this as any, config);
      var node: Node = this as any;
      node.on('input', (msg: any, send: Function, done: Function) => {
        switch(typeof msg.payload) {
          case 'number':
            node.status({ fill:"grey", shape:"dot", text: msg.payload.toString() });
            node.context().set('value', msg.payload)
            send(msg)
          break
          case 'string':
            const timer = node.context().get('timer');
            switch(msg.payload) {
              case config.startIncCommand:
                if (timer) break
                node.context().set('mode', 'inc')
                node.context().set('timer', setInterval(() => this.tick(send, this as any), config.interval));
              break
              case config.startDecCommand:
                if (timer) break
                node.context().set('mode', 'dec')
                node.context().set('timer', setInterval(() => this.tick(send, this as any), config.interval));
              break
              case config.stopIncCommand:
              case config.stopDecCommand:
                if (!timer) break
                clearInterval(timer);
                node.context().set('timer', null)
              break
              default:
                node.log(`missing command "${msg.payload}"`)
            }
          break
          default:
            // do nothing
        }
        if (done) {
          done()
        }
      });
    }
  }

red.nodes.registerType("time-based-dimmer", TimeBasedDimmerNode as any);
}