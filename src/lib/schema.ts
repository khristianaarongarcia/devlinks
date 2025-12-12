/**
 * Database Setup Script for Appwrite
 * 
 * Run this script once to create the database and collections in Appwrite.
 * You can run this with: npx ts-node src/lib/setup-database.ts
 * 
 * Or create the following manually in Appwrite Console:
 * 
 * Database: devlinks
 * 
 * Collection: users
 * Attributes:
 *   - name (string, required, size: 50)
 *   - email (string, required, size: 320) - unique index
 *   - username (string, required, size: 30) - unique index
 *   - password (string, required, size: 255)
 *   - bio (string, optional, size: 200)
 *   - avatar (string, optional, size: 500)
 * 
 * Collection: links
 * Attributes:
 *   - userId (string, required, size: 36) - index
 *   - title (string, required, size: 100)
 *   - url (string, required, size: 2000)
 *   - icon (string, required, size: 50)
 *   - clicks (integer, required, default: 0)
 *   - order (integer, required, default: 0)
 * 
 * Indexes:
 *   users: email (unique), username (unique)
 *   links: userId (key)
 */

export const SCHEMA = {
  database: {
    id: 'devlinks',
    name: 'DevLinks Database'
  },
  collections: {
    users: {
      id: 'users',
      name: 'Users',
      attributes: [
        { key: 'name', type: 'string', size: 50, required: true },
        { key: 'email', type: 'string', size: 320, required: true },
        { key: 'username', type: 'string', size: 30, required: true },
        { key: 'password', type: 'string', size: 255, required: true },
        { key: 'bio', type: 'string', size: 200, required: false },
        { key: 'avatar', type: 'string', size: 500, required: false },
      ],
      indexes: [
        { key: 'email_unique', type: 'unique', attributes: ['email'] },
        { key: 'username_unique', type: 'unique', attributes: ['username'] },
      ]
    },
    links: {
      id: 'links',
      name: 'Links',
      attributes: [
        { key: 'userId', type: 'string', size: 36, required: true },
        { key: 'title', type: 'string', size: 100, required: true },
        { key: 'url', type: 'string', size: 2000, required: true },
        { key: 'icon', type: 'string', size: 50, required: true },
        { key: 'clicks', type: 'integer', required: true, default: 0 },
        { key: 'order', type: 'integer', required: true, default: 0 },
      ],
      indexes: [
        { key: 'userId_index', type: 'key', attributes: ['userId'] },
        { key: 'order_index', type: 'key', attributes: ['order'] },
      ]
    }
  }
}
