import {
  Box,
  Container,
  TextField,
  Stack,
  Button,
  Typography,
  FormControl,
  MenuItem,
  Select,
  InputLabel,
} from "@mui/material";
import { useDispatch } from "react-redux";
import { useState } from "react";
import { joinChat } from "../store/chatSlice";
import { useNavigate } from "react-router-dom";
import type { JoinChatPayload } from "../types/interfaces";
import { Room } from "../types/enums";

export const JoinForm = () => {
  const [name, setName] = useState("");
  const [room, setRoom] = useState("General");

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: JoinChatPayload = {
      name,
      room,
    };
    if (name.trim()) {
      dispatch(joinChat(payload));
      navigate(`/chat/${room}`);
    }
  };

  return (
    <Container maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography component="h1" variant="h5" align="center" gutterBottom>
          Welcome to Chat
        </Typography>

        <Typography
          variant="body2"
          color="textSecondary"
          align="center"
          sx={{ mb: 3 }}
        >
          Please enter your name to join
        </Typography>

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Your Name"
              variant="outlined"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="Nickname"
            />

            <FormControl fullWidth>
              <InputLabel id="room-select-label">Room</InputLabel>
              <Select
                labelId="room-select-label"
                value={room}
                label="Room"
                onChange={(e) => setRoom(e.target.value)}
              >
                <MenuItem value={Room.General}>{Room.General}</MenuItem>
                <MenuItem value={Room.Tech}>{Room.Tech}</MenuItem>
                <MenuItem value={Room.Random}>{Room.Random}</MenuItem>
              </Select>
            </FormControl>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={!name.trim()}
              sx={{ mt: 1 }}
            >
              Join Chat
            </Button>
          </Stack>
        </form>
      </Box>
    </Container>
  );
};

export default JoinForm;
