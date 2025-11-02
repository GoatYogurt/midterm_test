import { useState, useEffect } from "react";
import { ethers } from "ethers";

function App() {
  const [account, setAccount] = useState(null);
  const [spender, setSpender] = useState("");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const init = async () => {
      if (!window.ethereum) {
        alert("Please install MetaMask!");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = import.meta.env.VITE_TOKEN_ADDRESS;

      const abi = [
        "function approve(address spender, uint256 value) public returns (bool)",
        "function allowance(address owner, address spender) public view returns (uint256)",
        "event Approval(address indexed owner, address indexed spender, uint256 value)",
        "event Transfer(address indexed from, address indexed to, uint256 value)",
      ];

      const contract = new ethers.Contract(address, abi, signer);
      setToken(contract);
      setAccount(await signer.getAddress());

      // === Fetch all old events ===
      const transferEvents = await contract.queryFilter("Transfer", 0, "latest");
      const approvalEvents = await contract.queryFilter("Approval", 0, "latest");
      const allEvents = [
        ...transferEvents
          .filter(e => e.args.from !== ethers.ZeroAddress)
          .map(e => ({ 
            type: "Transfer", 
            from: e.args.from, 
            to: e.args.to, 
            value: e.args.value.toString(), 
            blockNumber: e.blockNumber 
          })),
        ...approvalEvents.map(e => ({ 
            type: "Approval", 
            owner: e.args.owner, 
            spender: e.args.spender, 
            value: e.args.value.toString(), 
            blockNumber: e.blockNumber 
        }))
      ];

      // === Thêm timestamp vào từng event ===
      const uniqueBlocks = [...new Set(allEvents.map(e => e.blockNumber))];
      const blockMap = {};

      await Promise.all(uniqueBlocks.map(async (bn) => {
        const block = await provider.getBlock(bn);
        blockMap[bn] = new Date(block.timestamp * 1000).toLocaleString();
      }));

      const pastLogs = allEvents
        .map(e => ({
          ...e,
          time: blockMap[e.blockNumber],
        }))
        .sort((a, b) => b.blockNumber - a.blockNumber);

      setLogs(pastLogs);

      // === Listen new events ===
      contract.on("Transfer", async (from, to, value, event) => {
        const block = await provider.getBlock(event.blockNumber);
        setLogs((prev) => [
          {
            type: "Transfer",
            from,
            to,
            value: value.toString(),
            blockNumber: event.blockNumber,
            time: new Date(block.timestamp * 1000).toLocaleString(),
          },
          ...prev,
        ]);
      });

      contract.on("Approval", async (owner, spender, value, event) => {
        const block = await provider.getBlock(event.blockNumber);
        setLogs((prev) => [
          {
            type: "Approval",
            owner,
            spender,
            value: value.toString(),
            blockNumber: event.blockNumber,
            time: new Date(block.timestamp * 1000).toLocaleString(),
          },
          ...prev,
        ]);
      });
    };

    init();

    return () => {
      if (token) token.removeAllListeners();
    };
  }, []);

  const handleApprove = async () => {
    if (!token || !spender || !amount) return alert("❗ Missing inputs");
    const tx = await token.approve(spender, ethers.parseUnits(amount, 18));
    await tx.wait();
    alert("✅ Approved successfully!");
  };

  return (
    <div className="p-5 font-sans">
      <h1 className="text-2xl font-bold mb-4">ERC20 Approve Demo</h1>
      <p>Connected: {account}</p>

      <div className="mt-4">
        <input
          type="text"
          placeholder="Spender address"
          value={spender}
          onChange={(e) => setSpender(e.target.value)}
          className="border p-2 w-full mb-2"
        />
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="border p-2 w-full mb-2"
        />
        <button
          onClick={handleApprove}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Approve
        </button>
      </div>

      <h2 className="text-xl mt-6 font-semibold">📜 On-chain Transaction History</h2>
      {logs.length === 0 ? (
        <p className="text-gray-500">No transactions found</p>
      ) : (
        <ul className="mt-2">
          {logs.map((log, i) => (
            <li key={i} className="border-b py-1">
              <strong>[{log.type}]</strong>{" "}
              {log.type === "Transfer"
                ? `${log.from} → ${log.to}`
                : `${log.owner} → ${log.spender}`}{" "}
              : {ethers.formatUnits(log.value, 18)} tokens
              <span className="text-gray-400 ml-2">
                (Block {log.blockNumber}) 🕒 {log.time}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
