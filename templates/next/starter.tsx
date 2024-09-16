/**
 * Dependencies are auto-detected and installed.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { useState, useEffect } from "react";
import axios from "axios";

/**
 * Main App component. Feel free to create additional components within this file.
 */
export const App = () => {
  const [data, setData] = useState<any[]>([]);
  const [emailFilter, setEmailFilter] = useState("");

  useEffect(() => {
    fetchData();
  }, [emailFilter]);

  const fetchData = async () => {
    try {
      const response = await axios.get(`/api/users?email=${emailFilter}`);
      setData(response.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  const handleEmailFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailFilter(e.target.value);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">User Data Table</h1>
      <div className="mb-4">
        <label htmlFor="emailFilter" className="mr-2">
          Filter by Email:
        </label>
        <input
          type="text"
          id="emailFilter"
          value={emailFilter}
          onChange={handleEmailFilterChange}
          className="border border-gray-300 p-2 rounded"
          placeholder="Enter full email to filter"
        />
      </div>
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 p-2">ID</th>
            <th className="border border-gray-300 p-2">Name</th>
            <th className="border border-gray-300 p-2">Email</th>
            <th className="border border-gray-300 p-2">Company</th>
          </tr>
        </thead>
        <tbody>
          {data.map((user) => (
            <tr key={user.id}>
              <td className="border border-gray-300 p-2">{user.id}</td>
              <td className="border border-gray-300 p-2">{user.name}</td>
              <td className="border border-gray-300 p-2">{user.email}</td>
              <td className="border border-gray-300 p-2">
                {user.company.name}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Will auto-generate api routes for you.
 * For route params use :paramName in the path.
 */
export const api = [
  {
    method: "GET",
    path: "/api/users",
    handler: async (req: NextApiRequest, res: NextApiResponse) => {
      try {
        const { email } = req.query;
        let url = "https://jsonplaceholder.typicode.com/users";
        if (email) {
          url += `?email=${email}`;
        }
        const response = await axios.get(url);
        res.status(200).json(response.data);
      } catch (error) {
        res.status(500).json({ error: "Error fetching user data" });
      }
    },
  },
];
