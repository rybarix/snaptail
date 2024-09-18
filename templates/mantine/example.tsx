import {
  Table,
  TextInput,
  Box,
  Container,
  Title,
  Paper,
  Group,
} from "@mantine/core";
import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const elements = [
  { position: 6, mass: 12.011, symbol: "C", name: "Carbon" },
  { position: 7, mass: 14.007, symbol: "N", name: "Nitrogen" },
  { position: 39, mass: 88.906, symbol: "Y", name: "Yttrium" },
  { position: 56, mass: 137.33, symbol: "Ba", name: "Barium" },
  { position: 58, mass: 140.12, symbol: "Ce", name: "Cerium" },
];

export const App = () => {
  const [search, setSearch] = useState("");
  const [starData, setStarData] = useState([]);

  useEffect(() => {
    fetch("https://api.github.com/repos/rybarix/snaptail/stargazers", {
      headers: {
        Accept: "application/vnd.github.v3.star+json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        const formattedData = data.map((item, index) => {
          console.log(item);
          return {
            date: new Date(item.starred_at).toLocaleDateString(),
            stars: index + 1,
          };
        });
        setStarData(formattedData);
      })
      .catch((error) => console.error("Error fetching star data:", error));
  }, []);

  const filteredElements = elements.filter((element) =>
    element.symbol.toLowerCase().includes(search.toLowerCase())
  );

  const rows = filteredElements.map((element) => (
    <Table.Tr
      key={element.name}
      style={{
        backgroundColor:
          element.symbol.toLowerCase() === search.toLowerCase()
            ? "#ffff99"
            : "inherit",
      }}
    >
      <Table.Td>{element.position}</Table.Td>
      <Table.Td>{element.name}</Table.Td>
      <Table.Td>
        <Box
          component="span"
          style={{
            backgroundColor:
              element.symbol.toLowerCase() === search.toLowerCase()
                ? "#ffff00"
                : "inherit",
          }}
        >
          {element.symbol}
        </Box>
      </Table.Td>
      <Table.Td>{element.mass}</Table.Td>
    </Table.Tr>
  ));

  return (
    <Container size="lg" py="xl">
      <Title order={1} ta="center" mb="xl">
        Periodic Table Elements
      </Title>
      <TextInput
        placeholder="Search by symbol"
        mb="md"
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
      />
      <Paper shadow="sm" p="md" withBorder mb="xl">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Element position</Table.Th>
              <Table.Th>Element name</Table.Th>
              <Table.Th>Symbol</Table.Th>
              <Table.Th>Atomic mass</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </Paper>
      <Group>
        <Title order={2}>GitHub Stars for rybarix/snaptail</Title>
        <Paper shadow="sm" p="md" withBorder>
          <LineChart width={600} height={300} data={starData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="stars" stroke="#8884d8" />
          </LineChart>
        </Paper>
      </Group>
    </Container>
  );
};
