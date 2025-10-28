package com.meeting_assistant.meeting_assitant.util;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class DbMigrator {

    private static final Logger logger = LoggerFactory.getLogger(DbMigrator.class);

    public static void main(String[] args) throws Exception {
        String url = System.getenv().getOrDefault("JDBC_DATABASE_URL", "jdbc:postgresql://localhost:5432/calendar_db");
        String user = System.getenv().getOrDefault("DB_USER", "calendaruser");
        String pass = System.getenv().getOrDefault("DB_PASSWORD", "calendarpass");

        logger.info("Connecting to: {} as {}", url, user);

        try (Connection c = DriverManager.getConnection(url, user, pass)) {
            logger.info("Connected, applying migration...");
            try (InputStream in = DbMigrator.class.getResourceAsStream("/db/migration/V1__init.sql")) {
                if (in == null) {
                    logger.error("Migration file not found on classpath: /db/migration/V1__init.sql");
                    return;
                }
                String sql = new BufferedReader(new InputStreamReader(in)).lines().collect(Collectors.joining("\n"));
                // split on semicolon followed by newline to avoid splitting inside functions
                String[] statements = sql.split(";\s*\n");
                try (Statement st = c.createStatement()) {
                    for (String s : statements) {
                        String stmt = s.trim();
                        if (stmt.isEmpty())
                            continue;
                        logger.debug("Executing statement...\n{}",
                                (stmt.length() > 200 ? stmt.substring(0, 200) + "..." : stmt));
                        st.execute(stmt);
                    }
                }
            }
            logger.info("Migration applied successfully.");
        }
    }

}
