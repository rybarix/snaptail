import { useState } from "react";
import axios from "axios";
import { TextInput, Button, Container, Paper, Stack } from "@mantine/core";

export const App = () => {
  const [formData, setFormData] = useState({ name: "", email: "" });

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.post("/api/v1/user", formData);
      console.log("API response:", response.data);
      alert(JSON.stringify(response.data));
    } catch (error) {
      console.error("API error:", error);
    }
  };

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  return (
    <Container size="xs">
      <Paper shadow="sm" p="md">
        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <TextInput
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <Button type="submit">Submit</Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
};

export const api = [
  {
    method: "POST",
    path: "/api/v1/user",
    handler: async (req, reply) => {
      // Process the user data here
      const { name, email } = req.body;
      return reply.send({
        message: `User ${name} with email ${email} created successfully`,
      });
    },
  },
];
