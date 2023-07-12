import fs from 'fs'
import { getNfts, getDomain, getDomainDate } from 'ton-wallet-utils'
import { YOUR_WALLET_ADDRESS as address, DNS_COLLECTION_ADDRESS } from '../config.js'

async function checkDNS() {
  let { error, nfts } = await getNfts({ address })

  if (error) return console.log(error)

  if (!nfts.length) return console.log('No NFTs found')

  nfts = nfts.filter(nft => nft.collectionAddress === DNS_COLLECTION_ADDRESS)

  for (const nft of nfts) {
    const { address } = nft
    const domain = await getDomain({ address })
    const date = await getDomainDate({ address })
    const row = `${domain}, days left — ${date.till_expired.daysLeft}`
    fs.appendFileSync('./domains.txt', `${row}\n`)
  }

  process.exit(0)
}

checkDNS()