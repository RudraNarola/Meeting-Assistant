package com.meetingassistant.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    @GetMapping({"/", "/index"})
    public String index() {
        // forward to the static index.html in src/main/resources/static
        return "forward:/index.html";
    }
}
