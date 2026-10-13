// Bound the room's sockets, and reject drive-by browser WebSocket origins.
export function allowUpgrade(req, count, max=96) {
 if(count>=max)return false;
 if(!req.headers.origin)return true; // Allows the local protocol rehearsal / native clients.
 try{return new URL(req.headers.origin).host===req.headers.host;}catch{return false;}
}
