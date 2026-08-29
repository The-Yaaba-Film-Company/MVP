import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

function SmokeFixture() {
  return <div>frontend smoke ok</div>
}

describe('test harness', () => {
  it('executes and renders via RTL in jsdom', () => {
    render(<SmokeFixture />)
    expect(screen.getByText('frontend smoke ok')).toBeInTheDocument()
  })
})
