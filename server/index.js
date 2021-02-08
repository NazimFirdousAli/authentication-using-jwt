const { ApolloServer, gql } = require('apollo-server');
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient();

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { APP_SECRET } = require('./utils.js')

const resolvers = {
  Query: {
    users: async () => { return await prisma.user.findMany() },
  },
  Mutation: {
    signUp: async (root, { password, ...data }, context, info) => {

      const hashpassword = bcrypt.hashSync(password, 10)

      data.password = hashpassword;
      const uniqueEmail = await prisma.user.findUnique({where:{email:data.email}})
      if(uniqueEmail){
        throw new Error("Email exists")
      }

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
}
type AuthPayload{
  token: String!
  user:Users
}
  type Query {
    users: [Users]
  }
  type Mutation{
      signUp(email: String!, name: String!, password: String!):AuthPayload!
      login(email: String!, password: String!):AuthPayload!

  }
`;

const server = new ApolloServer({ typeDefs, resolvers });

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
