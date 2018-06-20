class HorizontalBar extends Polymer.mixinBehaviors([Polymer.IronRangeBehavior], Polymer.Element) {
  static get is () {
    return 'horizontal-bar'
  }

  static get properties () {
    return {
      values: {
        type: Array,
      },

      /**
       * True if the progress is disabled.
       */
      disabled: {
        type: Boolean,
        value: false,
        reflectToAttribute: true,
        observer: '_disabledChanged'
      },

      _domRepeatRendered: {
        type: Boolean,
        value: false
      }
    }
  }

  static get observers () {
    return [
      '_progressChanged(values.*, _domRepeatRendered)',
      '_valuesLengthChanged(values.splices)',
      '_minChanged(min)',
      '_minChanged(max)',
    ]
  }

  static get hostAttributes () {
    return {
      role: 'progressbar'
    }
  }

  constructor () {
    super()
    this.__firstRender = false
  }

  _attributeToClass (flag, className) {
    return flag ? className : ''
  }

  _transformProgress (progress, ratio) {
    if (progress) {
      // TODO(SKO) prev if translateX and scale would make sense together so that elements don't overlap eg. paint
      // effects on Edge
      let transform = `scaleX(${ratio / 100})`
      progress.style.transform = progress.style.webkitTransform = transform
    }
  }

  _calculateReversIndex (index, values) {
    return values.length - 1 - index
  }

  _domRepeat () {
    this._domRepeatRendered = true
  }

  _renderAll () {
    requestAnimationFrame(() => {
      this.values.forEach((item, index) => {
        this._renderValue(index, item.value)
        this._setBackgroundColor(index, item.barColor)
      })
    })
  }

  _renderValue (index, value) {
    let ratio = this._calcRatio(value) * 100
    let el = this.$$(`.bar-item-${index}`)
    this._transformProgress(el, ratio)
  }

  _setBackgroundColor (index, color) {
    let el = this.$$(`.bar-item-${index}`)
    if (el.style.backgroundColor !== color){
      el.style.backgroundColor = color
    }
  }

  _valuesLengthChanged (event) {
    this._renderAll()
  }

  _progressChanged (path, _domRepeatRendered) {
    if (path.path.indexOf('.') > -1) {
      if (this.values && this._domRepeatRendered) {
        this._renderValue(path.path.split('.')[1], path.value)
      }
    } else if (!this.__firstRender) {
      this.__firstRender = true
      this._renderAll()
    }
  }

  _minChanged(min) {
    this.setAttribute('aria-valuemin', min)
  }

  _maxChanged(max) {
    this.setAttribute('aria-valuemax', max)
  }

  _disabledChanged (disabled) {
    this.setAttribute('aria-disabled', disabled ? 'true' : 'false')
  }
}

customElements.define(HorizontalBar.is, HorizontalBar)