import { Button, TextField } from "@mui/material";
import { useDispatch } from "react-redux";
import { useState } from "react";
import { joinChat } from "../store/chatSlice";
import { useNavigate } from "react-router-dom";

export const JoinForm = () => {
  const [name, setName] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSumit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      dispatch(joinChat(name));
      navigate("/chat");
    }
  };

  return (
    <form onSubmit={handleSumit}>
      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Button type="submit">Join</Button>
    </form>
  );
};

export default JoinForm;
