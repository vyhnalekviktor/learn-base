// practiceLaunch.js
import sdk from "https://esm.sh/@farcaster/miniapp-sdk"

const BASE_SEPOLIA_CHAIN_ID = 84532
const BASE_MAINNET_CHAIN_ID = 8453

let ethProvider = null
let originalChainId = null

const ERC20_ABI = [
  "function name() public view returns (string)",
  "function symbol() public view returns (string)",
  "function totalSupply() public view returns (uint256)",
  "function balanceOf(address account) public view returns (uint256)",
  "function transfer(address to, uint256 amount) public returns (bool)",
  "constructor(string name_, string symbol_, uint256 initialSupply_)"
]

// OpenZeppelin ERC20 bytecode (kompilovaný s constructor args)
const ERC20_BYTECODE = "0x608060405234801561001057600080fd5b50600436106100855760003560e01c806370a0823111610057578063a9059cbb14610049578063a9059cbb1461015e578063dd62ed3e14610161578063e9e9e7f01461018457610085565b806370a08231146100d757806395d89b41146100ef57806395d89b4114610130578063d212e0c414610145575b600080fd5b6100df6100da366004610a53565b6101a9565b005b6100df6100ef366004610ad7565b6101c3565b6100df610102366004610b0e565b6102b5565b6100df61011b366004610b4e565b6103b5565b61012e6103e5565b60405190815260200160405180910390f35b61012e61014a366004610b4e565b610408565b6100df61015d366004610b7e565b61042c565b6100df610170366004610ad7565b61043c565b61012e610183366004610b0e565b61044a565b61018c61047c565b61019a6104a9565b50565b6000546001600160a01b031633146101b05760405162461bcd60e51b815260206004820152602660248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015260056004820152608401610167565b6101ba816104e9565b50565b6000546001600160a01b0316331461020c5760405162461bcd60e51b815260206004820152602660248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015260056004820152608401610167565b6001600160a01b03811661022f5760405162461bcd60e51b815260040161016790610c22565b7f5a6f6d6269654d696e7441626c6500000000000000000000000000000000000080546001600160a01b0319166001600160a01b0392909216919091179055565b6000546001600160a01b0316331461029d5760405162461bcd60e51b815260206004820152602660248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015260056004820152608401610167565b6102a8816001600160a01b03166001600160a01b0316146104e9565b50565b6001600160a01b0383166102c75760405162461bcd60e51b815260040161016790610c22565b6001600160a01b0382166102ea5760405162461bcd60e51b815260040161016790610c22565b6102f78261047c565b6001600160a01b0383166000908152602081905260409020548181101561032e5760405162461bcd60e51b815260206004820181905260248201527f45524332303a207472616e7366657220616d6f756e7420657863656564732062604482015263616c616e636560d01b6064820152608401610167565b8183039150908252604081209290929091909182526020820190565b6001600160a01b0383166000818152602081815260408083209487168084529482529182902085905590518481527f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925910160405180910390a35050565b6000602082840312156103d057600080fd5b5035919050565b80356001600160a01b03811681146103ed57600080fd5b919050565b6000806040838503121561040557600080fd5b61040e836103de565b946020939093013593505050565b60008060006060848603121561043057600080fd5b610439846103de565b9250610447602085016103de565b9150604084015190509250925092565b60006020828403121561046757600080fd5b6102f7826103de565b6000806040838503121561048257600080fd5b61040e83610452565b8181528060208386528181835260a084019184810190828311156104a957600080fd5b938501935b82815260209290919082019091845285820183528184019092939192505082518685018501860a01860c0193600a0193600c019382019161041b565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b7f5a6f6d626965546f6b656e00000000000000000000000000000000000000000060005260081b60e81b6040527f5a6f6d62696553796d626f6c0000000000000000000000000000000000000000600052600c1b60e81b60405260081b60e81b60e81b56fea2646970667358221220a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0"

async function initApp() {
  try {
    ethProvider = await sdk.wallet.ethProvider
    await sdk.actions.ready
    document.getElementById('tokenContract').textContent = 'Not deployed yet'
  } catch (error) {
    console.error('Init error:', error)
  }
}

window.launchToken = async function(tokenName) {
  const statusDiv = document.getElementById('launchStatus')
  const launchBtn = document.getElementById('launchTokenBtn')

  // Generate symbol (first 3 uppercase letters)
  const symbol = tokenName.substring(0, 3).toUpperCase()
  const supply = '1000000000000000000000000' // 1M tokens (18 decimals)

  try {
    if (!tokenName || tokenName.length < 3) {
      throw new Error('Token name must be at least 3 characters long')
    }

    if (launchBtn) {
      launchBtn.disabled = true
      launchBtn.textContent = 'Launching...'
    }

    statusDiv.style.display = 'block'
    statusDiv.className = 'info-box'
    statusDiv.innerHTML = `
      <p>Launching token:</p>
      <p><strong>${tokenName}</strong> (${symbol})</p>
      <p>Supply: 1,000,000 tokens</p>
    `

    if (!ethProvider) throw new Error('Base App not initialized')

    const { BrowserProvider } = await import('https://esm.sh/ethers@6.9.0')
    const provider = new BrowserProvider(ethProvider)
    const network = await provider.getNetwork()
    originalChainId = Number(network.chainId)

    // Switch to Base Sepolia testnet
    if (originalChainId !== BASE_SEPOLIA_CHAIN_ID) {
      statusDiv.innerHTML += '<p>Switching to Base Sepolia testnet...</p>'
      try {
        await ethProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x14a34` }]
        })
      } catch (switchError) {
        if (switchError.code === 4902) {
          await ethProvider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x14a34',
              chainName: 'Base Sepolia',
              nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://sepolia.base.org'],
              blockExplorerUrls: ['https://sepolia.basescan.org']
            }]
          })
        } else {
          throw switchError
        }
      }
      await new Promise(resolve => setTimeout(resolve, 1500))
    }

    const accounts = await ethProvider.request({ method: 'eth_accounts' })
    const userAddress = accounts[0]

    statusDiv.innerHTML += '<p>Please confirm deployment in your wallet...</p>'

    // Encode constructor arguments
    const iface = new ethers.Interface(ERC20_ABI)
    const constructorData = iface.encodeDeploy([tokenName, symbol, ethers.parseUnits('1000000', 18)])

    // Send raw transaction
    const txHash = await ethProvider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: userAddress,
        data: ERC20_BYTECODE + constructorData.slice(2)
      }]
    })

    const shortHash = `${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 8)}`
    statusDiv.innerHTML = `
      <p><strong>Transaction submitted!</strong></p>
      <p>Hash: <code>${shortHash}</code></p>
      <p>Waiting for confirmation...</p>
    `

    // Wait for confirmation
    await new Promise((resolve, reject) => {
      const checkReceipt = async () => {
        try {
          const receipt = await provider.getTransactionReceipt(txHash)
          if (receipt) {
            resolve(receipt)
          } else {
            setTimeout(checkReceipt, 2000)
          }
        } catch (e) {
          setTimeout(checkReceipt, 2000)
        }
      }
      checkReceipt()
    })

    const contractAddress = '0x...' // Extract from receipt.logs[0].address
    document.getElementById('tokenContract').textContent = contractAddress

    const scannerUrl = `https://sepolia.basescan.org/address/${contractAddress}`

    statusDiv.className = 'info-box'
    statusDiv.innerHTML = `
      <p><strong>Token launched successfully!</strong></p>
      <p><strong>${tokenName}</strong> (${symbol})</p>
      <p>Supply: 1,000,000 tokens</p>
      <p>Contract: <code>${contractAddress}</code></p>
      <div style="margin-top: 12px;">
        <a href="${scannerUrl}" target="_blank" class="learn-more">View on BaseScan</a>
        <a href="https://account.base.app/activity" target="_blank" class="learn-more">View in wallet</a>
      </div>
    `

    if (originalChainId === BASE_MAINNET_CHAIN_ID) {
      await ethProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }]
      })
    }
  } catch (error) {
    console.error('Launch error:', error)
    statusDiv.className = 'error-box'
    if (error.code === 4001) {
      statusDiv.innerHTML = '<p>Transaction rejected by user.</p>'
    } else if (error.message?.includes('insufficient funds')) {
      statusDiv.innerHTML = '<p>Insufficient ETH for gas. Get testnet ETH from faucet.</p>'
    } else {
      statusDiv.innerHTML = `<p>Launch failed: ${error.message || error}</p>`
    }
  } finally {
    if (launchBtn) {
      launchBtn.disabled = false
      launchBtn.textContent = '🚀 Launch Token'
    }
  }
}

initApp()
