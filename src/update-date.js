import { getNfts, transferTon, getDomain, getDomainDate } from 'ton-wallet-utils'
import { YOUR_WALLET_MNEMONIC, YOUR_WALLET_ADDRESS as address, YOUR_WALLET_VERSION as version, WAIT_SECONDS_BETWEEN_TX, DNS_COLLECTION_ADDRESS, UPDATE_IF_EXPIRES_IN_LESS_DAYS_THAN } from '../config.js'

const sleep = async(ms) => new Promise(resolve => setTimeout(resolve, ms))

const mnemonic = YOUR_WALLET_MNEMONIC.split(' ')

async function updateDNS() {
  const txs = []

  let { error, nfts } = await getNfts({ address })

  if (error) return console.log(error)

  if (!nfts.length) return console.log('No NFTs found')

  nfts = nfts.filter(nft => nft.collectionAddress === DNS_COLLECTION_ADDRESS)

  for (const nft of nfts) {
    const { address } = nft
    const domain = await getDomain({ address })
    const date = await getDomainDate({ address })
    const daysLeft = date?.till_expired?.daysLeft
    if (daysLeft > UPDATE_IF_EXPIRES_IN_LESS_DAYS_THAN) continue
    const amount = 0.05
    const tx = { mnemonic, address, version, amount, domain, daysLeft }
    txs.push(tx)
  }

  console.log(`Found ${txs.length} domains, updating will take ${(WAIT_SECONDS_BETWEEN_TX * txs.length) / 60} minutes...`)

  for (const tx of txs) {
    const { domain, daysLeft } = tx
    delete tx.domain
    delete tx.daysLeft
    await transferTon(tx)
    console.log(`Domain ${domain} was updated for 1 year, before it was expiring in ${daysLeft} days`)
    await sleep(WAIT_SECONDS_BETWEEN_TX * 1000)
  }
}

updateDNS()