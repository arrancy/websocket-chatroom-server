import { WebSocketServer, WebSocket } from "ws";
import z from "zod";
const wss = new WebSocketServer({ port: 8080 });
const joinSchema = z.object({
  type: z.enum(["join"]),
  payload: z.object({ roomId: z.string().max(6) }),
});
const createSchema = z.object({ type: z.enum(["create"]) });
const sendMessageSchema = z.object({
  type: z.enum(["message"]),
  payload: z.object({ content: z.string() }),
});
const alphabet = "abcdefghijklmnopqrstuvwxyz";
const roomsAndPeople = new Map<string, Set<WebSocket>>();
const roomsAndDeliveries = new Map<string, string[]>();
const generateRoom = () => {
  const randomNumber = Math.floor(Math.random() * 1000);
  let alphabetString = "";
  for (let i = 0; i < 3; i++) {
    const randomAlphabet = Math.floor(Math.random() * 26);

    alphabetString += alphabet[randomAlphabet];
  }
  return alphabetString + randomNumber;
};

// this socket input in the function below signifies the socket of the entity who has connected to this websocket server
wss.on("connection", function (socket) {
  //   socket.send("hello");
  //   setInterval(() => {
  //     socket.send("hello there");
  //   }, 2000);

  socket.on("close", () => {
    roomsAndPeople.forEach((value, key) => {
      value.forEach((s) => {
        if (s === socket) {
          value.delete(socket);
        }
      });
    });
  });

  socket.on("message", (data) => {
    try {
      const dataJson = JSON.parse(String(data));
      console.log(dataJson);
      const dataJsonJoinParsed = joinSchema.safeParse(dataJson);
      if (dataJsonJoinParsed.success) {
        const userData: z.infer<typeof joinSchema> = dataJson;
        let socketExists = false;
        roomsAndPeople.forEach((value, key) => {
          value.forEach((s) => {
            if (s === socket) {
              socketExists = true;
              const errorObject = {
                type: "error",
                payload: { errorMessage: "socket already exists in a room" },
              };
              return socket.send(JSON.stringify(errorObject));
            }
          });
        });

        if (!socketExists) {
          const roomId = userData.payload.roomId;
          const socketSet = roomsAndPeople.get(roomId);
          const errorObject = {
            type: "error",
            payload: { errorMessage: "invalid roomId" },
          };
          if (!socketSet) return socket.send(JSON.stringify(errorObject));
          socketSet.add(socket);
          roomsAndPeople.set(roomId, socketSet);
          return socket.send(
            JSON.stringify({
              status: "successJoin",
            }),
          );
        }
        return;
      }
      const dataJsonCreateParsed = createSchema.safeParse(dataJson);
      if (dataJsonCreateParsed.success) {
        let socketExists = false;
        roomsAndPeople.forEach((value, key) => {
          value.forEach((s) => {
            if (s === socket) {
              socketExists = true;
              const errorObject = {
                type: "error",
                payload: { errorMessage: "socket already exists in a room" },
              };
              return socket.send(JSON.stringify(errorObject));
            }
          });
        });
        if (!socketExists) {
          const roomId = generateRoom();
          const socketSet = new Set<WebSocket>();
          socketSet.add(socket);
          roomsAndPeople.set(roomId, socketSet);
          const successObject = { status: "success", payload: { roomId } };
          return socket.send(JSON.stringify(successObject));
        }
        return;
      }

      const { success } = sendMessageSchema.safeParse(dataJson);
      if (!success) {
        console.log("reached here");
        const errorObject = {
          type: "error",
          payload: { errorMessage: "error in message sending schema" },
        };
        return socket.send(JSON.stringify(errorObject));
      }
      const userData: z.infer<typeof sendMessageSchema> = dataJson;
      let socketFound: boolean = false;
      let currentRoom = "";
      roomsAndPeople.forEach((value, key) => {
        value.forEach((s) => {
          if (s === socket) {
            socketFound = true;
            currentRoom = key;
          }
        });
      });
      if (!socketFound || !currentRoom) {
        const errorObject = {
          type: "error",
          payload: { errorMessage: "socket not found" },
        };
        return socket.send(JSON.stringify(errorObject));
      }
      if (socketFound && currentRoom) {
        const socketSet = roomsAndPeople.get(currentRoom);
        if (!socketSet) return socket.send("unknown error occured");
        socketSet.forEach((value) => {
          if (value !== socket && value.readyState === WebSocket.OPEN) {
            const messageObject = {
              type: "message",
              payload: { content: userData.payload.content },
            };
            value.send(JSON.stringify(messageObject));
            return;
          } else {
            return value.send(
              JSON.stringify({
                type: "success",
                payload: { content: "message sent successfully" },
              }),
            );
          }
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        console.log(error);
        console.log(data.toString());
        const errorObject = {
          type: "error",
          payload: { errorMessage: "internal server error" },
        };
        return socket.send(JSON.stringify(errorObject));
      }
    }
  });
});

// connection to the server will happen as soon as the user joins
// would have to write the schema for what we can send
// i think first things first we would have to design the schema of the user can send and what the server can send
// for user {type : "join" payload : {"roomId" : "hfsj345"} }
// for user again {type : "create"}
// when create, room id gets created on the server side and the room gets added in the object and the room should add that user directly on the frontend
// user can send messages of course {type : "message", payload :{username : "abc123",content : "messageText" }
// if invalid schema server can just send invalid inputs
// if valid schema then on join it just sends success and adds the user to the map
// on create also it sends success
// on error it sends 'error'
// on every message that it sends to users the moment it receives it , it creates a unique id for that message, and sends it back and the moment the frontend receives it,
// it will send that message id back meaning it has been seen
