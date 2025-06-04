const rsStatus = rs.status();

if (rsStatus.ok === 0 || rsStatus.members.length === 1) {
  rs.initiate({
    _id: 'rs0',
    members: [{ _id: 0, host: 'localhost:27017' }],
  });
}