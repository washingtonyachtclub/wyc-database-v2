import { isDevEnvironment } from '@/lib/env'
import { SquareClient, SquareEnvironment } from 'square'

/** Server-only — holds the secret access token; never import into client code. */
export const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: isDevEnvironment() ? SquareEnvironment.Sandbox : SquareEnvironment.Production,
})

export const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID ?? ''
