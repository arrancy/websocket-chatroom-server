import { WebSocketServer, WebSocket } from "ws";
import z from "zod";
const wss = new WebSocketServer({ port: 8080 });
const joinSchema = z.object({
  type: "join",
  payLoad: z.object({ roomId: z.string().length(6) }),
});
const createSchema = z.object({ type: "create" });
const sendMessageSchema = z.object({
  type: "message",
  payload: z.object({ content: z.string() }),
});
const alphabet = "abcdefghijklmnopqrstuvwxyz";
const roomsAndPeople = new Map<string, WebSocket>();
const roomsAndDeliveries = new Map<string, string[]>();
const generateRoom = () => {
  const randomNumber = Math.floor(Math.random() * 1000);
  const randomAlphabet = Math.floor(Math.random() * 26);
  let alphabetString = "";
  for (let i = 0; i < 3; i++) {
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

  socket.on("message", (data) => {
    try {
      const dataJson = JSON.parse(String(data));
      const dataJsonJoinParsed = joinSchema.safeParse(dataJson);
      if (dataJsonJoinParsed.success) {
        const userData: z.infer<typeof joinSchema> = dataJson;
        let socketExists = false;
        roomsAndPeople.forEach((value, key) => {
          if (value === socket) {
            socketExists = true;
            return socket.send("error");
          }
        });

        if (!socketExists) {
          const roomId = userData.payLoad.roomId;
          roomsAndPeople.set(roomId, socket);
          return socket.send("success");
        }
        return;
      }
      const dataJsonCreateParsed = createSchema.safeParse(dataJson);
      if (dataJsonCreateParsed.success) {
        let socketExists = false;
        roomsAndPeople.forEach((value, key) => {
          if (value === socket) {
            socketExists = true;
            return socket.send("error");
          }
        });
        if (!socketExists) {
          const roomId = generateRoom();
          roomsAndPeople.set(roomId, socket);
          const successObject = { status: "success", roomId };
          return socket.send(JSON.stringify(successObject));
        }
        return;
      }

      const { success } = sendMessageSchema.safeParse(dataJson);
      if (!success) return socket.send("error");
      let socketFound = false;
      roomsAndPeople.forEach((value, key) => {
        if (socket === value) {
          socketFound = true;
          roomsAndPeople.forEach((value2, key2) => {
            if (key2 === key && value2 !== value) {
              return value2.send(JSON.stringify(dataJson));
            } else {
              return value.send("error");
            }
          });
        } else {
          return;
        }
      });
      if (!socketFound) {
        return socket.send("error");
      }
    } catch (error) {
      if (error instanceof Error) {
        socket.send("error");
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
