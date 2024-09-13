const polls = {};
export default function socketPolling(io, socket) {
  // 投票
  socket.on("start-poll", ({ question, options }, roomName) => {
    console.log(`start-poll: ${roomName}`, { question, options });
    if (!roomName) return;

    polls[roomName] = { question, options, votes: {} };
    io.to(roomName).emit("show-poll", { question, options });
  });

  socket.on("end-poll", (roomName) => {
    console.log(`end-poll: ${roomName}`);
    if (!roomName) return;

    const poll = polls[roomName];
    if (poll) {
      const results = calculateResults(poll);
      io.to(roomName).emit("show-results", results);
      delete polls[roomName];
    }
  });

  socket.on("vote", (option, roomName) => {
    console.log(`vote-poll: ${roomName}`, option);
    if (!roomName) return;
    console.log("polls[roomName]: ", polls[roomName]);

    const poll = polls[roomName];
    console.log("roomName: ", roomName);
    console.log("polls: ", polls);
    console.log("poll: ", poll);
    if (poll) {
      poll.votes[socket.id] = option;
      const results = calculateResults(poll);
      io.to(roomName).emit("update-results", results);
    }
  });

  function calculateResults(poll) {
    const votes = Object.values(poll.votes);
    const totalVotes = votes.length;
    console.log("totalVotes: ", totalVotes);

    const optionCounts = votes.reduce((counts, vote) => {
      counts.set(vote, (counts.get(vote) || 0) + 1);
      return counts;
    }, new Map());

    return poll.options.map((option) => {
      const voteCount = optionCounts.get(option) || 0;
      const percentage = totalVotes
        ? Math.round((voteCount / totalVotes) * 100)
        : 0;
      return { option, percentage };
    });
  }
}
