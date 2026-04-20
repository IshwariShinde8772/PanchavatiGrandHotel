This project currently bootstraps the schema from Sequelize models via `sequelize.sync()`.

For production deployment, convert the model definitions in `server/models` into explicit Sequelize CLI migrations so schema changes can be versioned safely.
