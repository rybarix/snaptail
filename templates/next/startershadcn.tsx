import React, { useState } from "react";
import type { NextApiRequest, NextApiResponse } from "next";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import {Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

export const App = () => {
  const [name, setName] = useState("");
  const [greeting, setGreeting] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGreet = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/greet?name=${name}`);
      const data = await response.text();
      setGreeting(data);
    } catch (error) {
      console.error("Error fetching greeting:", error);
      setGreeting("Failed to fetch greeting");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-[350px] mx-auto mt-20">
      <CardHeader>
        <CardTitle>Hello World</CardTitle>
        <CardDescription>Welcome to snaptail!</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <Input
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">What's this?</Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <p>
                This is a simple React component using shadcn/ui components.
              </p>
            </PopoverContent>
          </Popover>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleGreet} disabled={isLoading}>
          {isLoading ? "Loading..." : "Greet me"}
        </Button>
      </CardFooter>
      {greeting && (
        <CardContent>
          <p className="text-green-600">
            {greeting}
          </p>
        </CardContent>
      )}
    </Card>
  );
};


/**
 * Will auto-generate api routes for you.
 * For route params use :paramName in the path.
 */
export const api = [
  {
    method: "GET",
    path: "/api/greet",
    handler: async (req: NextApiRequest, reply: NextApiResponse) => {
      return reply.send(`Hello ${req.query.name as string} from API!`);
    },
  },
];