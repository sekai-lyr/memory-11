package com.sekai.game.controller;

import com.sekai.game.entity.User;
import com.sekai.game.security.JwtService;
import com.sekai.game.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private JwtService jwtService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        try {
            if (body == null) throw new IllegalArgumentException("请求数据不能为空");
            String username = body.get("username");
            String password = body.get("password");
            String nickname = body.get("nickname");
            User user = userService.register(username, password, nickname);
            return withAccessCookie(user, Map.of(
                "success", true,
                "userId", user.getId(),
                "username", user.getUsername(),
                "nickname", user.getNickname()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "reason", e.getMessage()
            ));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        if (body == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "reason", "请求数据不能为空"));
        }
        String username = body.get("username");
        String password = body.get("password");
        User user = userService.login(username, password).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "reason", "用户名或密码错误"
            ));
        }
        return withAccessCookie(user, Map.of(
            "success", true,
            "userId", user.getId(),
            "username", user.getUsername(),
            "nickname", user.getNickname(),
            "duelCoins", user.getDuelCoins()
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, jwtService.clearAccessCookie().toString())
            .body(Map.of("success", true));
    }

    private ResponseEntity<?> withAccessCookie(User user, Object body) {
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, jwtService.accessCookie(jwtService.issue(user)).toString())
            .body(body);
    }
}
