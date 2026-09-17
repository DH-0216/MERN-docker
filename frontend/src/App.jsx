import { useState } from "react";
import axios from "axios";
import { useEffect } from "react";

function App() {
  const [healthStatus, setHealthStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [data, setData] = useState(null);
  const [version, setVersion] = useState("v1");

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours} hour${hours !== 1 ? "s" : ""} ${minutes} minute${minutes !== 1 ? "s" : ""}`;
    }

    if (minutes > 0) {
      return `${minutes} minute${minutes !== 1 ? "s" : ""} ${secs} second${secs !== 1 ? "s" : ""}`;
    }

    return `${secs} second${secs !== 1 ? "s" : ""}`;
  };

  useEffect(() => {
    const getMessage = async () => {
      try {
        const response = await axios.get("http://localhost:5000/");

        setMessage(response.data.message);
      } catch (error) {
        setMessage("Error fetching message from API.");
        console.error("Error fetching message:", error);
      }
    };

    getMessage();
  }, []);

  const getHealth = async () => {
    try {
      setIsLoading(true);

      const response = await axios.get(
        `http://localhost:5000/api/${version}/health`,
      );

      const result = response.data;

      // Show message immediately
      if (result.status === "success") {
        setHealthStatus(result.message);
        setData(result.data);
      } else {
        setHealthStatus("API is not working fine.");
        setData(null);
      }

      // Start timer AFTER showing the message
      setTimeout(() => {
        setHealthStatus("");
        setData(null);
      }, 10000);
    } catch (error) {
      setHealthStatus("Error fetching health status.");
      setData(null);

      console.error("Error fetching health status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-4xl font-bold text-center pt-10">
        Welcome to the Docker App
        {message && (
          <span className="text-lg font-normal block mt-2 text-gray-600">
            {message}
          </span>
        )}
      </h1>

      <div className="flex justify-center mt-10">
        <h1 className="text-2xl font-semibold mr-4">Select API Version:</h1>
        <select
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1"
        >
          <option value="v1">v1</option>
          <option value="v2">v2</option>
        </select>
      </div>

      <div className="flex justify-center mt-5">
        <button
          onClick={getHealth}
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer"
        >
          {isLoading ? "Loading..." : `Get Health Status from ${version} API`}
        </button>
      </div>

      <div className="flex justify-center mt-5">
        {healthStatus && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
            <div>{healthStatus}</div>

            {data && (
              <div className="mt-2">
                <strong>Server uptime:</strong> {formatUptime(data.uptime)}
                <br />
                <strong>Timestamp:</strong> {data.timestamp}
              </div>
            )}
          </div>
        )}

        {!healthStatus && !isLoading && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative">
            Click the button to check the health status of the API.
          </div>
        )}
      </div>
    </>
  );
}

export default App;
