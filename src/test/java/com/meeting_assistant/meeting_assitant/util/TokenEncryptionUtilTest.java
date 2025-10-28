package com.meeting_assistant.meeting_assitant.util;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

public class TokenEncryptionUtilTest {

    @Test
    public void roundTripEncryptDecrypt() {
        String secret = "unit-test-secret";
        String plain = "hello-encryption";

        String cipher = TokenEncryptionUtil.encrypt(plain, secret);
        assertNotNull(cipher);
        assertNotEquals(plain, cipher);

        String decrypted = TokenEncryptionUtil.decrypt(cipher, secret);
        assertEquals(plain, decrypted);
    }

    @Test
    public void differentIvProducesDifferentCiphertext() {
        String secret = "unit-test-secret";
        String plain = "repeatable-plaintext";

        String c1 = TokenEncryptionUtil.encrypt(plain, secret);
        String c2 = TokenEncryptionUtil.encrypt(plain, secret);

        assertNotEquals(c1, c2, "Ciphertexts should differ due to random IV");
    }

    @Test
    public void decryptWithWrongSecretThrows() {
        String secret = "unit-test-secret";
        String wrong = "wrong-secret";
        String plain = "sensitive-value";

        String cipher = TokenEncryptionUtil.encrypt(plain, secret);
        assertThrows(RuntimeException.class, () -> TokenEncryptionUtil.decrypt(cipher, wrong));
    }

}
