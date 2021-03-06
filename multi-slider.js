class MultiSlider extends Polymer.GestureEventListeners(Polymer.Element) {
  static get is () { return 'multi-slider' }

  // -----------------------------------------------------------------------------------------------------------
  // properties
  // -----------------------------------------------------------------------------------------------------------
  static get properties () {
    return {
      /**
       * Used to customize the displayed value of the pin. E.g. the value can be prefixed with a '$' like '$99'
       */
      displayFunction: {
        type: Function,
        value: function () {
          return function (value) {
            return value
          }
        }
      },

      containerColor: {
        type: String
      },

      /**
       * the minimal value (lower range) of the slider.
       */
      min: {
        type: Number,
        value: 0,
        notify: true,
        reflectToAttribute: true
      },

      /**
       * the maximal value (upper range) of the slider.
       */
      max: {
        type: Number,
        value: 100,
        notify: true,
        reflectToAttribute: true
      },

      /**
       * the current value of the lower range of the slider.
       */
      valueMin: {
        type: Number,
        value: 0,
        notify: true,
        reflectToAttribute: true
      },

      /**
       * the current value of the upper range of the slider.
       */
      valueMax: {
        type: Number,
        value: 100,
        notify: true,
        reflectToAttribute: true
      },

      /**
       * the minimal step-change of a knob on the slider
       */
      step: {
        type: Number,
        value: 1,
        notify: true,
        reflectToAttribute: true
      },

      /**
       * optional minimal value for the difference between valueMin and valueMax
       * by default this is negative (valueDiffMin is ignored)
       */
      valueDiffMin: {
        type: Number,
        value: 0,
        notify: true,
        reflectToAttribute: true
      },

      /**
       * optional maximal value for the difference between valueMin and valueMax
       * by default this is negative (valueDiffMax is ignored)
       */
      valueDiffMax: {
        type: Number,
        value: 0,
        notify: true,
        reflectToAttribute: true
      },

      /**
       * if true, pins with numeric value label are shown when the slider thumb
       * is pressed. Use for settings for which users need to know the exact
       * value of the setting.
       */
      alwaysShowPin: {
        type: Boolean,
        value: false,
        notify: true
      },

      /**
       * if true, pins with numeric value label are shown when the slider thumb
       * is pressed. Use for settings for which users need to know the exact
       * value of the setting.
       */
      pin: {
        type: Boolean,
        value: false,
        notify: true
      },

      /**
       * if true, the slider thumb snaps to tick marks evenly spaced based
       * on the `step` property value.
       */
      snaps: {
        type: Boolean,
        value: false,
        notify: true
      },

      /**
       * if true, the slider is disabled.
       */
      disabled: {
        type: Boolean,
        value: false,
        notify: true
      },

      /**
       * time-window (in msec) to keep the slider._setTransiting(true) for the
       * two paper-single-range-slider elements, when using the setValues() method to change the
       * selected range. This should be slightly higher than the transition time defined for the
       * paper-single-range-slider (which, as of paper-single-range-slider-v1.0.11, is 0.08s/0.18s).
       */
      transDuration: {
        type: Number,
        value: 250,
      },

      values: {
        type: Array,
        notify: true
      }
    }
  }

  static get observers () {
    return [
      '_containerColorChanged(containerColor)'
    ]
  }

  _onSliderKnobClicked (event) {
    event.stopPropagation()
  }

  _sliderCountChanged (event) {
    requestAnimationFrame(() => {
      this.init()
    })
  }

  _containerColorChanged (color) {
    this.style.setProperty('--horizontal-bar-container-color', color)
  }

  // -----------------------------------------------------------------------------------------------------------
  // initial settings
  // -----------------------------------------------------------------------------------------------------------
  ready () {
    super.ready()
    requestAnimationFrame(() => {
      this.init()
    })
  }

  getFocusedSlider () {
    let sliderElement = this.shadowRoot.querySelector('slider-knob[focused]')
    if (sliderElement) {
      let sliderModel = this.$.slider.modelForElement(sliderElement).item
      return {element: sliderElement, model: sliderModel, index: this.values.indexOf(sliderModel)}
    }
  }

  _indexHasLeftSlider (index) {
    return index > 0
  }

  _indexHasRightSlider (index) {
    return index < this.values.length - 1
  }

  _checkForValueDiffMin (value, minValue) {
    return (value - minValue) < this._valueDiffMin
  }

  _getPreviousSliderValue (index) {
    return this.get(`values.${index - 1}.value`)
  }

  _getNextSliderValue (index) {
    return this.get(`values.${index + 1}.value`)
  }

  _setPreviousSliderValue (index, value) {
    // calling _setValueForIndex recursively to honor every next and previous index
    return this._setValueForIndex(index - 1, value)
  }

  _setNextSliderValue (index, value) {
    // calling _setValueForIndex recursively to honor every next and previous index
    return this._setValueForIndex(index + 1, value)
  }

  _getValidValueToSet (value, previousValue, nextValue) {
    value = Math.max(this.min, value)
    value = Math.min(this.max, value)
    if (previousValue !== undefined) {
      value = Math.max(previousValue + this._valueDiffMin, value)
    }
    if (nextValue !== undefined) {
      value = Math.min(nextValue - this._valueDiffMin, value)
    }
    return value
  }

  _setSliderValue (index, value) {
    this.set(`values.${index}.value`, value)
    this.dispatchEvent(new CustomEvent('multi-slider-value-changed', {detail: {value, index}}))
  }

  _setValueForIndex (index, value) {
    let previousValue, nextValue

    if (this._indexHasLeftSlider(index)) {
      let prevSliderValue = this._getPreviousSliderValue(index)
      if (this._checkForValueDiffMin(value, prevSliderValue) && this._getPreviousSliderValue(index) > this.min) {
        this._setPreviousSliderValue(index, this._getValidValueToSet(value - this._valueDiffMin))
      }
    }

    if (this._indexHasRightSlider(index)) {
      let nextSliderValue = this._getNextSliderValue(index)
      if (this._checkForValueDiffMin(nextSliderValue, value) && this._getNextSliderValue(index) < this.max) {
        this._setNextSliderValue(index, this._getValidValueToSet(value + this._valueDiffMin))
      }
    }

    previousValue = this._getPreviousSliderValue(index)
    nextValue = this._getNextSliderValue(index)

    value = this._getValidValueToSet(value, previousValue, nextValue)
    this._setSliderValue(index, value)
    return value
  }

  _sliderChange (event) {
    let index = this.$.slider.indexForElement(event.target)
    let value = this._setValueForIndex(index, event.target.immediateValue)

    // set the value within the range back to the slider
    event.target.set('value', value)

    this.dispatchEvent(new CustomEvent('multi-slider-value-changed', {detail: {value, index}}))

    if (this.alwaysShowPin) {
      event.target._expandKnob()
    }
  }

  _immediateValueChange (event) {
    this._setValueForIndex(this.$.slider.indexForElement(event.target), event.target.immediateValue)
  }

  /**
   * initialize basic properties (can be called again by the user)
   * @method init
   */
  init () {
    this.setDisabled(this.disabled)

    // some basic properties
    if (this.alwaysShowPin) { this.pin = true }

    this._setValueDiff()

    // activate the pins, and never hide
    if (this.alwaysShowPin) {
      this._expandKnowForAll()
    }
  }

  _expandKnowForAll () {
    this.getAllSlider().forEach((el) => {
      el._expandKnob()
    })
  }

  // internal variables for minimal/maximal difference between this.valueMin, this.valueMax
  // each one is between zero and the maximal difference available in the range, and
  // the this._valueDiffMin can not be larger than this._valueDiffMax
  _setValueDiff () {
    this._valueDiffMax = Math.max(this.valueDiffMax, 0)
    this._valueDiffMin = Math.max(this.valueDiffMin, 0)
  }

  // helper function to cast to a boolean
  _toBool (valIn) { return (valIn === 'false' || valIn === '0') ? false : Boolean(valIn) }

  /**
   * set the minimal step-change of a knob on the slider
   * @method setMax
   */
  setStep (stepIn) {
    this.step = stepIn
  }

  /**
   * set the minimal difference between selected values
   * @method setValueDiffMin
   */
  setValueDiffMin (valueDiffMin) {
    this._valueDiffMin = valueDiffMin
  }

  /**
   * set the maximal difference between selected values
   * @method setValueDiffMax
   */
  setValueDiffMax (valueDiffMax) {
    this._valueDiffMax = valueDiffMax
  }

  /**
   * set the tapValueMove property
   * @method setValueDiffMax
   */
  setTapValueMove (isTapValueMove) {
    this.tapValueMove = this._toBool(isTapValueMove)
  }

  getAllSlider () {
    return Array.from(this.shadowRoot.querySelectorAll('slider-knob'))
  }

  /**
   * set the disabled parameter
   * @method setValueDiffMax
   */
  setDisabled (isDisabled) {
    this.disabled = this._toBool(isDisabled)
    let pointEvt = this.disabled ? 'none' : 'auto'

    this.getAllSlider().forEach((el) => {
      el.getEle('#sliderKnob').style.pointerEvents = pointEvt
    })
  }
}

customElements.define(MultiSlider.is, MultiSlider)