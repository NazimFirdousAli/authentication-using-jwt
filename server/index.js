const { ApolloServer, gql } = require('apollo-server');
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient();

const path = require('path')
const fs = require('fs')

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { APP_SECRET } = require('./utils.js');

const resolvers = {
  Query: {
    users: async () => { return await prisma.user.findMany() },
  },
  Mutation: {
    signUp: async (root, { password, image, ...data }, context, info) => {
      const uniqueEmail = await prisma.user.findUnique({ where: { email: data.email } })
      if (uniqueEmail) {
        throw new Error("Email exists")
      }

      const hashpassword = bcrypt.hashSync(password, 10)
      data.password = hashpassword;

      //   data.image = await new Promise((resolve, reject) => {
      //     return image.then(({ createReadStream, ...rest })=> {
      //         const id = Math.random().toString(32).substr(7);
      //         const filename = `${id}-${rest.filename}`;
      //         if (!fs.existsSync("./uploads")) fs.mkdirSync("./uploads");
      //         createReadStream()
      //             .pipe(fs.createWriteStream(path.join('./uploads', filename)))
      //             .on('error', (error) => reject(new Error(error.message)))
      //             .on('finish', () => resolve(filename));
      //     })
      // })


      // data.image = await new Promise((resolve, reject) => {
      // return image.then(image => {
      //   console.log(image)
      //   const { createReadStream, filename } = image
      //   const stream = createReadStream()
      //   const pathName = path.join(__dirname, `./uploads/${filename}`)
      //  resolve(stream.pipe(fs.createWriteStream(pathName))) 
      //  reject(new Error("Not found"))
      // })
      // })
      // ?

      const { createReadStream, filename } = await image
      const stream = createReadStream()
      const pathName = path.join(__dirname, `./uploads/${filename}`)
      await stream.pipe(fs.createWriteStream(pathName))
      const id = Math.random().toString(32).substr(7);
      data.image = `${id}-${filename}`


      const createdUser = await prisma.user.create({ data });
      const token = jwt.sign({ userId: createdUser.id }, APP_SECRET);
      return {
        token,
        user: createdUser,
      }
    },
    login: async (root, { ...data }, context, info) => {
      const loginUser = await prisma.user.findUnique({
        where: { email: data.email }
      })
      if (!loginUser) {
        throw new Error("User not found")
      }

      const checkUserPassword = await bcrypt.compareSync(data.password, loginUser.password)
      if (!checkUserPassword) {
        throw new Error("Password not match")
      }
      const token = jwt.sign({ userId: loginUser.id }, APP_SECRET)
      return {
        token,
        user: loginUser
      }
    }
  }

}

const typeDefs = gql`
  type Users {
    id: Int!
  email: String! 
  name: String!
  password: String!
  image:String
}
type AuthPayload{
  token: String!
  user:Users
}
  type Query {
    users: [Users]
  }
  type Mutation{
      signUp(email: String!, name: String!, password: String!,image: Upload):AuthPayload!
      login(email: String!, password: String!):AuthPayload!

  }
`;

const server = new ApolloServer({ typeDefs, resolvers });

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
