package com.meeting_assistant.meeting_assitant.util;

import static org.junit.jupiter.api.Assertions.*;

import java.io.InputStream;

import org.junit.jupiter.api.Test;

public class DbMigratorTest {

    @Test
    public void migrationFileExistsAndHasStatements() throws Exception {
        try (InputStream in = DbMigrator.class.getResourceAsStream("/db/migration/V1__init.sql")) {
            assertNotNull(in, "Migration resource should be present on classpath");
            String sql = new java.io.BufferedReader(new java.io.InputStreamReader(in)).lines()
                    .collect(java.util.stream.Collectors.joining("\n"));
            assertTrue(sql.length() > 0, "Migration file should not be empty");
            String[] statements = sql.split(";\\s*\\n");
            assertTrue(statements.length > 0, "Should split into at least one SQL statement");
            boolean hasCreate = sql.toUpperCase().contains("CREATE TABLE");
            assertTrue(hasCreate, "Migration should contain CREATE TABLE statements");
        }
    }

}
