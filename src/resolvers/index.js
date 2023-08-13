const path = require("path");
const fsPromises = require("fs/promises");
const {
  fileExists,
  readFile,
  deleteFile,
  getDirectoryFileNames,
} = require("../utils/fileHandling");
const { GraphQLError } = require("graphql");
const crypto = require("crypto");

const itemDirectory = path.join(__dirname, "..", "data", "items");
const shoppingCartDirectory = path.join(
  __dirname,
  "..",
  "data",
  "shoppingcarts"
);

exports.resolvers = {
  Query: {
    getItemById: async (_, args) => {
      const itemId = args.itemId;
      const itemFilePath = path.join(
        itemDirectory,
        `${itemId}.json`
      );
      const itemExists = await fileExists(itemFilePath);
      if (!itemExists)
        return new GraphQLError("That product does not exist");

      const data = JSON.parse(await fsPromises.readFile(itemFilePath));
      return data;
    },

    getAllItems: async (_) => {
      const items = await getDirectoryFileNames(itemDirectory);
      const itemData = [];
      for (const file of items) {
        const itemfilePath = path.join(itemDirectory, file);
        const data = JSON.parse(await fsPromises.readFile(itemfilePath));
        itemData.push(data);
      }
      return itemData;
    },

    getShoppingCartById: async (_, args) => {
      const shoppingCartId = args.shoppingCartId;
      const shoppingCartFilePath = path.join(
        shoppingCartDirectory,
        `${shoppingCartId}.json`
      );

      const shoppingCartExists = await fileExists(shoppingCartFilePath);
      if (!shoppingCartExists)
        return new GraphQLError("That shoppingcart does not exist");

      const data = JSON.parse(await fsPromises.readFile(shoppingCartFilePath));
      return data;
    },
  },

  Mutation: {
    createItem: async (_, args) => {
      if (args.title.length === 0)
        return new GraphQLError("Name must be longer");
      const newItem = {
        id: crypto.randomUUID(),
        title: args.title,
        price: args.price,
        description: args.description || "",
      };

      let filePath = path.join(itemDirectory, `${newItem.id}.json`);
      let idExists = true;
      while (idExists) {
        const exists = await fileExists(filePath);
        if (exists) {
          newItem.id = crypto.randomUUID();
          filePath = path.join(itemDirectory, `${newItem.id}.json`);
        }
        idExists = exists;
      }
      await fsPromises.writeFile(filePath, JSON.stringify(newItem));
      return newItem;
    },

    createShoppingCart: async (_, args) => {
      const newShoppingCart = {
        id: crypto.randomUUID(),
        total: 0,
        items: [],
      };

      let filePath = path.join(
        shoppingCartDirectory,
        `${newShoppingCart.id}.json`
      );

      let idExists = true;
      while (idExists) {
        const exists = await fileExists(filePath);

        if (exists) {
          newShoppingCart.id = crypto.randomUUID();
          filePath = path.join(
            shoppingCartDirectory,
            `${newShoppingCart.id}.json`
          );
        }
        idExists = false;
      }
      await fsPromises.writeFile(filePath, JSON.stringify(newShoppingCart));
      return newShoppingCart;
    },

    addToShoppingCart: async (_, args) => {
      const itemId = args.itemId;
      const shoppingCartId = args.shoppingCartId;

      const itemFilePath = path.join(itemDirectory, `${itemId}.json`);

      const shoppingCartFilePath = path.join(
        shoppingCartDirectory,
        `${shoppingCartId}.json`
      );
      const shoppingCartExists = await fileExists(shoppingCartFilePath);

      if (!shoppingCartExists)
        return new GraphQLError("That shoppingcart does not exist");

      const itemExists = await fileExists(itemFilePath);

      if (!itemExists) return new GraphQLError("That item does not exist");

      let shoppingCartData = JSON.parse(await fsPromises.readFile(shoppingCartFilePath));

      const itemData = JSON.parse(await fsPromises.readFile(itemFilePath));

      const newItem = {
        id: itemData.id,
        title: itemData.title,
        description: itemData.description,
        price: itemData.price,
      };

      shoppingCartData.items.push(newItem);
      shoppingCartData.totalPrice = 0;
      for (let i = 0; i < shoppingCartData.items.length; i++) {
        shoppingCartData.totalPrice += shoppingCartData.items[i].price || 0;
      }

      await fsPromises.writeFile(
        shoppingCartFilePath,
        JSON.stringify(shoppingCartData)
      );

      return shoppingCartData;
    },

    removeFromShopCart: async (_, args) => {
      const itemId = args.itemId;
      const shoppingCartId = args.shoppingCartId;
      const shoppingCartFilePath = path.join(
        shoppingCartDirectory,
        `${shoppingCartId}.json`
      );

      const itemFilePath = path.join(itemDirectory, `${itemId}.json`);

      const shoppingCartExists = await fileExists(shoppingCartFilePath);
      if (!shoppingCartExists)
        return new GraphQLError("That shoppingcart does not exist");

      const itemExists = await fileExists(itemFilePath);
      if (!itemExists) return new GraphQLError("That item does not exist");

      let shoppingCartData = JSON.parse(
        await fsPromises.readFile(shoppingCartFilePath));
      success = false;

      for (let i = 0; i < shoppingCartData.items.length; i++) {
        if (itemId === shoppingCartData.items[i].id) {
          shoppingCartData.items.splice([i], 1);
          success = true;
        }
      }
      shoppingCartData.totalPrice = 0;

      for (let i = 0; i < shoppingCartData.items.length; i++) {
        shoppingCartData.total += shoppingCartData.items[i].price;
      }

      await fsPromises.writeFile(
        shoppingCartFilePath,
        JSON.stringify(shoppingCartData)
      );

      return shoppingCartData;
    },

    deleteShoppingCart: async (_, args) => {
      const ShoppingCartId = args.shoppingCartId;

      const filePath = path.join(
        shoppingCartDirectory,
        `${ShoppingCartId}.json`
      );

      const shoppingCartExists = await fileExists(filePath);
      if (!shoppingCartExists)
        return new GraphQLError("That shoppingcart does not exist");
      try {
        await deleteFile(filePath);
      } catch (error) {
        return {
          deletedId: ShoppingCartId,
          success: false,
        };
      }

      return {
        deletedId: ShoppingCartId,
        success: true,
      };
    },
    deleteItem: async (_, args) => {
      const itemId = args.itemId;

      const filePath = path.join(itemDirectory, `${itemId}.json`);

      const itemExists = await fileExists(filePath);
      if (!itemExists)
        return new GraphQLError("That shoppingcart does not exist");
      try {
        await deleteFile(filePath);
      } catch (error) {
        return {
          deletedId: itemId,
          success: false,
        };
      }

      return {
        deletedId: itemId,
        success: true,
      };
    },
  },
};
