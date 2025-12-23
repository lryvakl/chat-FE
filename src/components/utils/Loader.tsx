import { Box, CircularProgress, Typography } from "@mui/material";

import type { LoaderProps } from "../../types/interfaces";

export const Loader = ({ fullScreen = false, message }: LoaderProps) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: fullScreen ? "100vh" : "100%",
        width: "100%",
        bgcolor: fullScreen ? "background.default" : "transparent",
      }}
    >
      <CircularProgress />
      {message && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 2, fontWeight: 500 }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default Loader;
