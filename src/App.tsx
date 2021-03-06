import * as d3 from 'd3'
import * as React from 'react'
import * as HilbertUtils from './HilbertUtils'

import './App.css'

// TODO: Add color scale for dB.
// TODO: Add interactive normal 1D spectrum
// TODO: Add transitions to convert between 1D and 2D.
const ORDER = 10

class App extends React.Component {

  private hilbertSvg: SVGSVGElement
  private barGraphSvg: SVGSVGElement

  private hilbertGraph: HilbertUtils.HilbertGraph
  private audioContext: AudioContext
  private analyser: AnalyserNode
  private source: MediaStreamAudioSourceNode

  private oscillator: OscillatorNode

  constructor() {
    super()
  }

  public componentWillUpdate() {
    return false
  }

  public componentDidMount() {
    this.setup()
  }

  // TODO: Add basic button to click through first
  public render() {
    return (
      <div className="App">
        <svg id="hilbert-chart" ref={(svg) => this.hilbertSvg = svg as SVGSVGElement} />
        <svg id="bar-graph" ref={(svg) => this.barGraphSvg = svg as SVGSVGElement} />
      </div>
    )
  }

  private async getStream() {
    return await navigator.mediaDevices.getUserMedia({ audio: true })
  }

  private async setup() {
    await this.setupWebAudio()
    this.drawHilbert()
  }

  private async setupWebAudio() {
    this.audioContext = new (window as any).AudioContext()
    this.analyser = this.audioContext.createAnalyser()

    this.source = this.audioContext.createMediaStreamSource(await this.getStream())
    this.source.connect(this.analyser)

    // FFTSize is 2x because of nyquist cutoff. Furthermore, for most music, the
    // top half of sampled frequencies is pretty boring. so double a few more times!
    // A better method might be to downsample from the usual soundcloud default of 44.1 kHz
    // But there is limited browser support
    this.analyser.fftSize = 1 << (ORDER + 3)
    this.analyser.smoothingTimeConstant = 0.4

    this.oscillator = this.audioContext.createOscillator()
    this.oscillator.connect(this.audioContext.destination)

    const buffer = new Float32Array(this.analyser.frequencyBinCount)

    d3.timer(() => {
      this.analyser.getFloatFrequencyData(buffer)
      this.hilbertGraph.update(buffer)
    }, 10)
  }

  private drawHilbert = () => {
    const canvasWidth = Math.min(window.innerWidth / 2, window.innerHeight) - 20

    this.hilbertGraph = new HilbertUtils.HilbertGraph(
      this.hilbertSvg,
      this.barGraphSvg,
      canvasWidth,
      ORDER,
      (frequency: number) => {
        this.oscillator.disconnect()
        this.oscillator = this.audioContext.createOscillator()

        if (frequency === 0) {
          return
        }

        this.oscillator.frequency.value = frequency
        this.oscillator.connect(this.audioContext.destination)
        this.oscillator.start()
      },
    )

    // this.hilbertGraph.drawLine()
  }

}

export default App
