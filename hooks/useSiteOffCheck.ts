import { useState, useEffect } from "react";
import axios from "axios";

export const useSiteOffCheck = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSiteOff, setIsSiteOff] = useState(false);
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    const checkSiteStatus = async () => {
      try {
        const res = await axios.get("/api/site-off-check");
        setIsSiteOff(res.data.isSiteOff);
        setDeadline(res.data.deadline);
      } catch (error) {
        // Jika API error (misal kampus down total), kita asumsikan tidak site-off
        // atau bisa disesuaikan dengan kebutuhan Anda
        setIsSiteOff(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSiteStatus();
  }, []);

  return { isLoading, isSiteOff, deadline };
};
