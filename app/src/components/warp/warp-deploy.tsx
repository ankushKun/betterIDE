import { createContract } from "arweavekit/contract";
import { contractsType } from "../../../hooks/useContracts";
import useDeployments from "../../../hooks/useDeployments";
import { useReducer } from "react";
import { Icons } from "@/components/icons";

const derivations = [
  "not allowed",
  "Allowed-With-Credit",
  "Allowed-With-Indication",
  "Allowed-With-License-Passthrough",
  // "Allowed-With-RevenueShare"
];

const commercialUses = ["not allowed", "Allowed", "Allowed-With-Credit"];

function extractFunctionsFromSwitchCase(src: string) {
  // const functionRegex = /function\s+([^\s(]+)\s*\(([^)]*)\)\s*{([^}]*)}/g;
  const functionRegex = /case\s+"([^"]+)"/g;
  const matches = src.matchAll(functionRegex);
  const functions = [];

  for (const match of matches) {
    if (match[1] == "handle") continue;
    functions.push(match[1]);
  }
  return functions;
}

interface DeployState {
  contractName: string;
  // contractSrc: string,
  // stateSrc: string,
  deployEnv: "local" | "testnet" | "mainnet";
  result: string;
  usingWebWallet: boolean;
  deploySuccess: boolean;
  fileName: string;
  walletJWK: object | undefined;
  contractTxID: string;
  derivation: string;
  commercialUse: string;
  isError: boolean;
}

const istate: DeployState = {
  contractName: "",
  deployEnv: "local",
  result: "",
  usingWebWallet: false,
  deploySuccess: false,
  walletJWK: undefined,
  fileName: "",
  contractTxID: "",
  derivation: "",
  commercialUse: "",
  isError: false,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function WarpDeploy({
  contracts,
  target,
  test,
}: {
  contracts: contractsType;
  target: string;
  test: any;
}) {
  const { newDeployment } = useDeployments();

  function init(state: DeployState): DeployState {
    return { ...state, contractName: target };
  }

  const [state, dispatch] = useReducer(reducer, istate, init);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function reducer(state: DeployState, action: any): DeployState {
    switch (action.type) {
      case "set_contract_name":
        return { ...state, contractName: action.payload };
      case "set_env":
        return { ...state, deployEnv: action.payload };
      case "set_result":
        return { ...state, result: action.payload };
      case "set_web_wallet":
        return { ...state, usingWebWallet: action.payload };
      case "set_deploy_success":
        return { ...state, deploySuccess: action.payload };
      case "set_file": {
        const fileObj = action.payload;
        const reader = new FileReader();
        reader.onload = () => {
          const wallet = JSON.parse(reader.result as string);
          dispatch({ type: "set_wallet_jwk", payload: wallet });
        };
        reader.readAsText(fileObj);
        return { ...state, fileName: fileObj.name };
      }
      case "set_wallet_jwk":
        return { ...state, walletJWK: action.payload, usingWebWallet: false };
      case "set_contract_id":
        return { ...state, contractTxID: action.payload };
      case "set_derivation":
        return { ...state, derivation: action.payload };
      case "set_commercial_use":
        return { ...state, commercialUse: action.payload };
      case "is_error":
        return { ...state, isError: action.payload };
      case "deploy_another":
        return {
          ...state,
          deploySuccess: false,
          contractName: "",
          contractTxID: "",
          derivation: "",
          commercialUse: "",
        };
    }
  }

  async function deploy() {
    if (!state.contractName) return alert("Please select a contract");
    if (!state.deployEnv)
      return alert("Please select a deployment environment");
    if (!state.usingWebWallet && !state.walletJWK)
      return alert("Please upload a wallet file");

    const csource = contracts[state.contractName]["contract.js"];
    const cstate = contracts[state.contractName]["state.json"];

    const tags = [
      { name: "App-Name", value: "Better-IDE" },
      { name: "App-Version", value: "1.0.0" },
    ];

    if (state.derivation)
      tags.push({ name: "Derivation", value: state.derivation });
    if (state.commercialUse)
      tags.push({ name: "Commercial-Use", value: state.commercialUse });

    try {
      const contract = await createContract({
        wallet: state.usingWebWallet ? "web_wallet" : state.walletJWK,
        contractSource: csource,
        initialState: cstate,
        environment: state.deployEnv,
        strategy: "arweave",
        tags,
      });
      console.log(contract);
      dispatch({ type: "set_deploy_success", payload: true });
      dispatch({ type: "set_contract_id", payload: contract.contractTxId });
      dispatch({
        type: "set_result",
        payload: "Deployed successfully!\nID: " + contract.contractTxId,
      });
      newDeployment(
        state.contractName,
        contract.contractTxId,
        state.deployEnv,
        extractFunctionsFromSwitchCase(
          contracts[state.contractName]["contract.js"]
        )
      );
      dispatch({ type: "is_error", payload: false });
    } catch (e) {
      console.log(e);
      dispatch({ type: "is_error", payload: true });
      dispatch({ type: "set_result", payload: e.toString() });
      dispatch({ type: "set_deploy_success", payload: false });
      dispatch({ type: "set_contract_id", payload: "" });
    }
  }

  if (!state) return <></>;
  return (
    <div className="h-full flex flex-col items-center justify-evenly w-full">
      {!state.deploySuccess ? (
        <div className="flex flex-col justify-center overflow-scroll grow gap-5 w-full">
          <div className="grow"></div>
          <div className="flex gap-10 justify-center items-center">
            <div>
              <div>Select Contract</div>
              <select
                className="p-1 rounded "
                value={state.contractName}
                defaultValue={state.contractName}
                onChange={(e) =>
                  dispatch({
                    type: "set_contract_name",
                    payload: e.target.value,
                  })
                }
              >
                <option value="" disabled>
                  Select a contract
                </option>
                {Object.keys(contracts).map((c) => {
                  if (c == "input") return;
                  return <option value={c}>{c}</option>;
                })}
              </select>
            </div>
            <div>
              <div>Select Environment</div>
              <select
                className="p-1 rounded"
                value={state.deployEnv}
                defaultValue={state.deployEnv}
                onChange={(e) =>
                  dispatch({ type: "set_env", payload: e.target.value })
                }
              >
                <option value="" disabled>
                  Select an environment
                </option>
                <option value="local">Local (npx arlocal)</option>
                <option value="testnet">testnet</option>
                <option value="mainnet">Mainnet</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <div className="hover:scale-105 active:scale-95 transition-all duration-200 p-2 px-4">
              <label
                htmlFor="wallet"
                className="p-2 px-4 cursor-pointer rounded bg-[#093E49] text-center w-fit"
              >
                {!state.walletJWK
                  ? "Import a wallet.json file"
                  : `Imported: ${state.fileName} ✅`}
              </label>
              <input
                type="file"
                accept="application/JSON"
                id="wallet"
                className="hidden"
                onChange={(e) =>
                  dispatch({ type: "set_file", payload: e.target.files[0] })
                }
              />
            </div>
            <button
              className="p-2 px-4 cursor-pointer rounded bg-[#093E49] text-center w-fit hover:scale-105 active:scale-95"
              onClick={() => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (window as any).arweaveWallet
                  .connect([
                    "ACCESS_ADDRESS",
                    "SIGN_TRANSACTION",
                    "ACCESS_PUBLIC_KEY",
                    "SIGNATURE",
                  ])
                  .then(() => {
                    dispatch({ type: "set_web_wallet", payload: true });
                  })
                  .catch(() => {
                    dispatch({ type: "set_web_wallet", payload: false });
                    alert("Error connecting to web wallet");
                  });
              }}
            >
              Use Web Wallet {state.usingWebWallet && "✅"}
            </button>
          </div>

          <div className="flex flex-col gap-3 justify-center items-center">
            <div className="text-center">
              <span className="font-bold text-xl">
                Universal Data Licensing
              </span>
              <br />
              <span className="font-base">
                Protect the ownership of your content
              </span>
            </div>
            <div className="flex gap-10">
              <div>
                <div>License your code</div>
                <select
                  className="p-1 rounded"
                  defaultValue={derivations[0]}
                  onChange={(e) =>
                    dispatch({
                      type: "set_derivation",
                      payload: e.target.value,
                    })
                  }
                >
                  {derivations.map((c) => (
                    <option value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <div>Add a commercial license</div>
                <select
                  className="p-1 rounded"
                  defaultValue={commercialUses[0]}
                  onChange={(e) =>
                    dispatch({
                      type: "set_commercial_use",
                      payload: e.target.value,
                    })
                  }
                >
                  {commercialUses.map((c) => (
                    <option value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <button
            className="bg-[#093E49] p-2 px-4 rounded w-fit mx-auto"
            onClick={() => deploy()}
          >
            Deploy! 🚀
          </button>
          <div className="grow"></div>
          {state.result && (
            <pre
              className={`bg-black/20 border-t border-white/20 p-2 ${
                !state.isError ? "text-green-300" : "text-red-300"
              }`}
            >
              [ Result ]<br />
              <br />
              {state.result}
            </pre>
          )}
        </div>
      ) : (
        <div className="text-center flex flex-col gap-4 justify-center items-center min-h-[80vh]">
          <div className="text-3xl font-bold flex gap-1">
            <Icons.tick height={18} width={18} />
            Your contract has been successfully deployed!
          </div>
          <div className="flex gap-1 mx-auto">
            Txn ID: {state.contractTxID}{" "}
            <Icons.copy
              height={18}
              width={18}
              className="cursor-pointer"
              onClick={() => {
                navigator.clipboard.writeText(state.contractTxID);
                alert("Copied to clipboard");
              }}
            />
          </div>
          <button
            className="bg-[#093E49] p-2 px-4 rounded w-fit mx-auto"
            onClick={() => dispatch({ type: "deploy_another" })}
          >
            Deploy Another
          </button>
          <button
            className="bg-[#093E49] p-2 px-4 rounded w-fit mx-auto"
            onClick={() => test(state.contractName)}
          >
            Test this contract
          </button>
        </div>
      )}
    </div>
  );
}
