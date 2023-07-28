import { getNfts, getDomain, getDomainDate, loadWallet, transferTon } from 'ton-wallet-utils'
import { TonClient } from 'ton'
import TonWeb from 'tonweb'
import { YOUR_WALLET_MNEMONIC, YOUR_WALLET_ADDRESS as address, YOUR_WALLET_VERSION as version, WAIT_SECONDS_BETWEEN_TX, DNS_COLLECTION_ADDRESS, UPDATE_IF_EXPIRES_IN_LESS_DAYS_THAN, TONCENTER_RPC, TONCENTER_API_KEY } from '../config.js'

const sleep = async(ms) => new Promise(resolve => setTimeout(resolve, ms))

const mnemonic = YOUR_WALLET_MNEMONIC.split(' ')

const clientTon = new TonClient({ endpoint: TONCENTER_RPC, apiKey: TONCENTER_API_KEY })

const { wallet } = await loadWallet({ mnemonic, version })

const contract = clientTon.open(wallet)

async function renewDNS() {
  console.log('Loading your NFT domains data...')

  const txs = []

  let { error, nfts } = await getNfts({ address })

  if (error) return console.log(error)

  if (!nfts.length) return console.log('No NFTs found')

  nfts = nfts.filter(nft => nft.collectionAddress === DNS_COLLECTION_ADDRESS)

  console.log(`Parsing all your domains, and expiring dates, it can take some time...`)

  for (const nft of nfts) {
    const { address } = nft
    const domain = await getDomain({ address })
    const date = await getDomainDate({ address })
    const daysLeft = date?.till_expired?.daysLeft
    if (daysLeft > UPDATE_IF_EXPIRES_IN_LESS_DAYS_THAN) continue
    const amount = 0.015

    const op_code = 0x4eb1f0f9 // 'change_dns_record'
    const Cell = TonWeb.boc.Cell
    const cell = new Cell()
    cell.bits.writeUint(op_code, 32)
    cell.bits.writeUint(0, 64)
    cell.bits.writeUint(0, 256)
    const payload = cell.toBoc()

    const tx = { mnemonic, address, version, amount, payload, domain, daysLeft }
    txs.push(tx)
  }

  if (!txs.length) return console.log('No domains to renew')

  const willTakeMinutes = Math.max(1, Math.round((WAIT_SECONDS_BETWEEN_TX * txs.length) / 60))

  console.log(`Found ${txs.length} domains, updating will take ≈ ${willTakeMinutes} ${willTakeMinutes < 2 ? 'minute' : 'minutes'}...`)

  for (const tx of txs) {
    const { domain, daysLeft } = tx
    delete tx.domain
    delete tx.daysLeft
    const seqNo = await contract.getSeqno()
    await transferTon(tx)
    console.log(`Transaction to renew ${domain} was sent, waiting...`)
    await ensureSeqNoInc(seqNo)
    console.log(`Domain ${domain} was renewed for 1 year, before it was expiring in ${daysLeft} days`)
  }
}

renewDNS()

async function ensureSeqNoInc(seqNo) {
  let seqNoIncremented = false

  for (let i = 0; i < 5; i++) {
    await sleep(WAIT_SECONDS_BETWEEN_TX * 1000)
    const newSeqNo = await contract.getSeqno()
    if (newSeqNo === seqNo + 1) {
      seqNoIncremented = true
      break
    }
  }

  if (!seqNoIncremented) {
    throw new Error('seqNo not incremented, something went wrong')
  }
}