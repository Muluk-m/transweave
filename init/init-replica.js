db = db.getSiblingDB("admin");

const host = "host.docker.internal:27017";

rs.initiate({
  _id: "rs0",
  members: [
    {
      _id: 0,
      host: host
    }
  ]
});