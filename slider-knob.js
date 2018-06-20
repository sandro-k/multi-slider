class SliderKnob extends Polymer.mixinBehaviors([
    Polymer.IronA11yKeysBehavior,
    Polymer.IronFormElementBehavior,
    Polymer.IronRangeBehavior,
    Polymer.PaperInkyFocusBehavior],
  Polymer.Element) {

  static get is () {
    return 'slider-knob'
  }

  static get properties () {
    return {

      color: {
        type: String,
      },

      /**
       * Used to customize the displayed value of the pin. E.g. the value can be prefixed with a '$' like '$99'
       */
      displayFunction: {
        type: Function,
        value () {
          return function (value) {
            return value
          }
        }
      },

      /**
       * If true, the slider thumb snaps to tick marks evenly spaced based
       * on the `step` property value.
       */
      snaps: {
        type: Boolean,
        value: false,
        notify: true
      },

      /**
       * If true, a pin with numeric value label is shown when the slider thumb
       * is pressed. Use for settings for which users need to know the exact
       * value of the setting.
       */
      pin: {
        type: Boolean,
        value: false,
        notify: true
      },

      /**
       * The number that represents the current secondary progress.
       */
      secondaryProgress: {
        type: Number,
        value: 0,
        notify: true,
        observer: '_secondaryProgressChanged'
      },

      /**
       * The immediate value of the slider.  This value is updated while the user
       * is dragging the slider.
       */
      immediateValue: {
        type: Number,
        value: 0,
        readOnly: true,
        notify: true
      },

      /**
       * If true, the knob is expanded
       */
      expand: {
        type: Boolean,
        value: false,
        readOnly: true
      },

      /**
       * True when the user is dragging the slider.
       */
      dragging: {
        type: Boolean,
        value: false,
        readOnly: true
      },

      transiting: {
        type: Boolean,
        value: false,
        readOnly: true
      },
    }
  }

  constructor () {
    super()

    this._boundLongPress = this._onLongPress.bind(this)
  }

  ready () {
    super.ready()
    this._ensureAttribute('tabindex', 0)
    this._ensureAttribute('role', 'slider')

    this._listen(this.$.sliderKnob, 'long-press-event', this._boundLongPress)
  }

  _onLongPress (event) {
    this.fire('slider-knob-long-pressed', {event: event})
  }

  _listen (node, evType, handler) {
    if (Polymer.Gestures.gestures[evType]) {
      Polymer.Gestures.addListener(node, evType, handler)
    } else {
      node.addEventListener(evType, handler)
    }
  }

  static get observers () {
    return [
      '_updateKnob(value, min, max, snaps, step)',
      '_valueChanged(value)',
      '_immediateValueChanged(immediateValue)',
      '_colorChanged(color)'
    ]
  }

  get keyBindings () {
    return {
      'left': '_leftKey',
      'right': '_rightKey',
      'down pagedown home': '_decrementKey',
      'up pageup end': '_incrementKey'
    }
  }

  _colorChanged (color) {
    this.style.setProperty('--slider-knob-color', color)
    this.style.setProperty('--slider-knob-start-color', color)
    this.style.setProperty('--slider-knob-start-border-color', color)
    this.style.setProperty('--slider-knob-pin-start-color', color)
    this.style.setProperty('--slider-knob-pin-color', color)
    // this.style.setProperty('background',  color)
  }

  /**
   * Increases value by `step` but not above `max`.
   * @method increment
   */
  increment () {
    this.value = this._clampValue(this.value + this.step)
  }

  /**
   * Decreases value by `step` but not below `min`.
   * @method decrement
   */
  decrement () {
    this.value = this._clampValue(this.value - this.step)
  }

  _updateKnob (value, min, max, snaps, step) {
    this.setAttribute('aria-valuemin', min)
    this.setAttribute('aria-valuemax', max)
    this.setAttribute('aria-valuenow', value)

    this._positionKnob(this._calcRatio(value) * 100)
  }

  _valueChanged () {
    this.fire('value-change', {composed: true})
  }

  _immediateValueChanged () {
    if (this.dragging) {
      this.fire('immediate-value-change', {composed: true})
    } else {
      this.value = this.immediateValue
    }
  }

  _secondaryProgressChanged () {
    this.secondaryProgress = this._clampValue(this.secondaryProgress)
  }

  _expandKnob () {
    this._setExpand(true)
  }

  _resetKnob () {
    this.cancelDebouncer('expandKnob')
    this._setExpand(false)
  }

  _positionKnob (ratio) {
    this._setImmediateValue(this._calcStep(this._calcKnobPosition(ratio)))
    this._setRatio(this._calcRatio(this.immediateValue) * 100)

    this.$.sliderKnob.style.left = `${this.ratio}%`
    if (this.dragging) {
      this._knobstartx = (this.ratio * this._w) / 100
      this.translate3d(0, 0, 0, this.$.sliderKnob)
    }
  }

  _calcKnobPosition (ratio) {
    return (this.max - this.min) * ratio / 100 + this.min
  }

  _onTrack (event) {
    event.stopPropagation()
    switch (event.detail.state) {
      case 'start':
        this._trackStart(event)
        break
      case 'track':
        this._trackX(event)
        break
      case 'end':
        this._trackEnd()
        break
    }
  }

  _trackStart (event) {
    this._setTransiting(false)
    this._w = this.$.sliderBar.offsetWidth
    this._x = this.ratio * this._w / 100
    this._startx = this._x
    this._knobstartx = this._startx
    this._minx = -this._startx
    this._maxx = this._w - this._startx
    this.$.sliderKnob.classList.add('dragging')
    this._setDragging(true)
    this.fire('slider-knob-down')
  }

  _trackX (event) {
    if (!this.dragging) {
      this._trackStart(event)
    }

    let direction = this._isRTL ? -1 : 1
    let dx = Math.min(
      this._maxx, Math.max(this._minx, event.detail.dx * direction))

    this._x = this._startx + dx

    let immediateValue = this._calcStep(this._calcKnobPosition(this._x / this._w * 100))
    this._setImmediateValue(immediateValue)

    // update knob's position
    let translateX = ((this._calcRatio(this.immediateValue) * this._w) - this._knobstartx)
    this.translate3d(`${translateX}px`, 0, 0, this.$.sliderKnob)
  }

  _trackEnd () {
    let s = this.$.sliderKnob.style

    this.$.sliderKnob.classList.remove('dragging')
    this._setDragging(false)
    this._resetKnob()
    this.value = this.immediateValue

    s.transform = s.webkitTransform = ''

    this.fire('change', {composed: true})
  }

  _knobdown (event) {
    this._expandKnob()

    // cancel selection
    event.preventDefault()

    // set the focus manually because we will called prevent default
    this.focus()

  }

  _knobTransitionEnd (event) {
    if (event.target === this.$.sliderKnob) {
      this._setTransiting(false)
    }
  }

  _mergeClasses (classes) {
    return Object.keys(classes).filter(
      function (className) {
        return classes[className]
      }).join(' ')
  }

  _getClassNames () {
    return this._mergeClasses({
      disabled: this.disabled,
      pin: this.pin,
      snaps: this.snaps,
      ring: this.immediateValue <= this.min,
      expand: this.expand,
      dragging: this.dragging,
      transiting: this.transiting
    })
  }

  get _isRTL () {
    if (this.__isRTL === undefined) {
      this.__isRTL = window.getComputedStyle(this)['direction'] === 'rtl'
    }
    return this.__isRTL
  }

  _leftKey (event) {
    if (this._isRTL)
      this._incrementKey(event)
    else
      this._decrementKey(event)
  }

  _rightKey (event) {
    if (this._isRTL)
      this._decrementKey(event)
    else
      this._incrementKey(event)
  }

  _incrementKey (event) {
    if (!this.disabled) {
      if (event.detail.key === 'end') {
        this.value = this.max
      } else {
        this.increment()
      }
      this.fire('change')
      event.preventDefault()
    }
  }

  _decrementKey (event) {
    if (!this.disabled) {
      if (event.detail.key === 'home') {
        this.value = this.min
      } else {
        this.decrement()
      }
      this.fire('change')
      event.preventDefault()
    }
  }

  _changeValue (event) {
    this.value = event.target.value
    this.fire('change', {composed: true})
  }

  _inputKeyDown (event) {
    event.stopPropagation()
  }

  // create the element ripple inside the `sliderKnob`
  _createRipple () {
    this._rippleContainer = this.$.sliderKnob
    return Polymer.PaperInkyFocusBehaviorImpl._createRipple.call(this)
  }

  // Hide the ripple when user is not interacting with keyboard.
  // This behavior is different from other ripple-y controls, but is
  // according to spec: https://www.google.com/design/spec/components/sliders.html
  _focusedChanged (receivedFocusFromKeyboard) {
    if (receivedFocusFromKeyboard) {
      this.ensureRipple()
    }
    if (this.hasRipple()) {
      // note, ripple must be un-hidden prior to setting `holdDown`
      if (receivedFocusFromKeyboard) {
        this._ripple.style.display = ''
      } else {
        this._ripple.style.display = 'none'
      }
      this._ripple.holdDown = receivedFocusFromKeyboard
    }
  }

  getEle (tag) {
    return this.shadowRoot.querySelector(tag)
  }

  /**
   * Fired when the slider-knob's value changes.
   *
   * @event value-change
   */

  /**
   * Fired when the slider-knob's immediateValue changes. Only occurs while the
   * user is dragging.
   *
   * To detect changes to immediateValue that happen for any input (i.e.
   * dragging, tapping, clicking, etc.) listen for immediate-value-changed
   * instead.
   *
   * @event immediate-value-change
   */

  /**
   * Fired when the slider-knob's value changes due to user interaction.
   *
   * Changes to the slider-knob's value due to changes in an underlying
   * bound variable will not trigger this event.
   *
   * @event change
   */
}

customElements.define(SliderKnob.is, SliderKnob)