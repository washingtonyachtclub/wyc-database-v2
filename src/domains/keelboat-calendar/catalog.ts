import { isDevEnvironment } from '@/lib/env'
import { squareClient } from '@/lib/square'
import type { RentalRate, RentalRateKey } from './pricing'

const SANDBOX_VARIATIONS: Partial<Record<RentalRateKey, string>> = {
  'student:outboard:weekday:full': 'KMSQZ77LZLE7ZU3E552EFIVW',
  'student:outboard:weekend:full': '264Q4OKSUCXFKWJ2O76RCMKQ',
  'nonstudent:outboard:weekday:full': 'S73J3RBDSWAFHXF6IX4MKXNX',
  'nonstudent:outboard:weekend:full': 'O2O4IXERZSE3WBCYGPYPALMR',
  'student:outboard:weekday:half': 'XNVNN5KISNW5NKD3ZAXK5GIQ',
  'student:outboard:weekend:half': 'U3CCPO4PEKSWVLKVW2HFEOVH',
  'nonstudent:outboard:weekday:half': '2FFGDFXMB5TZ5NJU5YLLJHQO',
  'nonstudent:outboard:weekend:half': 'GYRYJBE5AK7RHER2Q7H33DRE',
  'student:inboard:weekday:full': 'LLOD4JVX7M6KMDVE5HCTVCH4',
  'student:inboard:weekend:full': 'CU4H6RGLGUQZJCNJ6J6HGGNB',
  'nonstudent:inboard:weekday:full': 'OYPTKKZO3P6OLNBTENW5CD3W',
  'nonstudent:inboard:weekend:full': 'CTLIVPH4SU2Q2PZSIFWRFBWC',
  'student:inboard:weekday:half': 'OLEFM5XKX2QIH26FGUC4T6AZ',
  'student:inboard:weekend:half': 'VSRDOMQNSMNR34UMYCN546OE',
  'nonstudent:inboard:weekday:half': 'QREND263IKKRNW3ROXZA3C5U',
  'nonstudent:inboard:weekend:half': 'NYVKUYCR7EDK7WZLHWSUQDFW',
}
const PRODUCTION_VARIATIONS: Partial<Record<RentalRateKey, string>> = {
  'student:outboard:weekday:full': '3W7QQ37AP262DTJHHCPD43LV',
  'student:outboard:weekend:full': 'IY6RAAWGB6FV4ECSAFLQETXQ',
  'nonstudent:outboard:weekday:full': 'KNVB2YG54CZJB5B3OR5T5VEZ',
  'nonstudent:outboard:weekend:full': '74V2UG5M75WYGW7VDB7ZIW3G',
  'student:outboard:weekday:half': 'A5OKUTXS5V57C3TXLYEQC66D',
  'student:outboard:weekend:half': 'DGN77RRFC52UMZIINX5EPPNH',
  'nonstudent:outboard:weekday:half': 'K57IVKOLCXGC63Y7IJMZ7H5C',
  'nonstudent:outboard:weekend:half': '33ZIKQEWOSFU65YK475Q36P6',
  'student:inboard:weekday:full': 'NXDJYQN5USH2VOEBZBUV3BGB',
  'student:inboard:weekend:full': 'OTYMMIWYWQN327VH7QDB6AHO',
  'nonstudent:inboard:weekday:full': 'WYD2YYG4OUMOFSSOBFJ74FQP',
  'nonstudent:inboard:weekend:full': '4HDRSXLOMUUFJV7L6I3JCSYC',
  'student:inboard:weekday:half': '3NRWVGC2ZI63UMIVWVH7ZMUN',
  'student:inboard:weekend:half': '5FMZNTPRMADHIIE6F2JILO7P',
  'nonstudent:inboard:weekday:half': 'RXYEFNCMKHD5RJID2RGM6UPV',
  'nonstudent:inboard:weekend:half': 'UPKVQ74W3L4Q7YGWEO5MMU43',
}

export async function readRentalRates(): Promise<RentalRate[]> {
  const variations = isDevEnvironment() ? SANDBOX_VARIATIONS : PRODUCTION_VARIATIONS
  const entries = Object.entries(variations) as [RentalRateKey, string][]
  if (entries.length !== 16) throw new Error('Rental catalog configuration is incomplete')
  const response = await squareClient.catalog.batchGet({
    objectIds: entries.map(([, id]) => id),
  })
  return entries.map(([key, variationId]) => {
    const object = response.objects?.find((item) => item.id === variationId)
    const price =
      object?.type === 'ITEM_VARIATION' ? object.itemVariationData?.priceMoney : undefined
    if (!price || price.amount == null || price.amount <= 0n || !price.currency) {
      throw new Error('Rental catalog variation has no valid price')
    }
    const amountCents = Number(price.amount)
    if (!Number.isSafeInteger(amountCents))
      throw new Error('Rental price is outside the supported range')
    return { key, variationId, amountCents, currency: price.currency }
  })
}
