/**
 * Dependencies are auto-detected and installed.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { useState, useEffect } from "react";
import moment from "moment";
import axios from "axios";

/**
 * Main App component. Feel free to create additional components within this file.
 */
export const App = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    axios
      .get("https://jsonplaceholder.typicode.com/todos/1")
      .then((res) => res.data)
      .then((data) => setData(data))
      .catch((err) => console.log(err));
  }, []);

  return (
    <div>
      <h1>Today is {moment().format("DD-MM-YYYY")}</h1>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
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
    path: "/api/v1/form",
    handler: async (req: NextApiRequest, reply: NextApiResponse) => {
      return reply.send({ hello: "world" });
    },
  },
];
