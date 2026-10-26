import next from "eslint-config-next";

const config = [...next, { ignores: [".next/**", "node_modules/**", "output/**", "scripts/**"] }];
export default config;
