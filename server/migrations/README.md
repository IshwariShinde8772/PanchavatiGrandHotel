This project currently bootstraps the schema from Sequelize models via `sequelize.sync()`.

For production deployment, convert the model definitions in `server/models` into explicit Sequelize CLI migrations so schema changes can be versioned safely.

Run migrations from the `server` workspace with:

- `npm run migrate`
- `npm run migrate:undo`
