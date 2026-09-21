package com.sekai.game.service;

import com.sekai.game.entity.Deck;
import com.sekai.game.entity.DeckCard;
import com.sekai.game.entity.User;
import com.sekai.game.repository.DeckCardRepository;
import com.sekai.game.repository.DeckRepository;
import com.sekai.game.repository.CardRepository;
import com.sekai.game.repository.UserCardRepository;
import com.sekai.game.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class DeckService {

    @Autowired
    private DeckRepository deckRepository;

    @Autowired
    private DeckCardRepository deckCardRepository;

    @Autowired
    private CardRepository cardRepository;

    @Autowired
    private UserCardRepository userCardRepository;

    @Autowired
    private UserRepository userRepository;

    public List<Deck> getUserDecks(Long userId) {
        return deckRepository.findByUserId(userId);
    }

    public Optional<Deck> getDeckById(String deckId) {
        return deckRepository.findById(deckId);
    }

    @Transactional
    public Deck createDeck(Long userId, String name, String coverCardId, List<String> mainCardIds) {
        if (deckRepository.countByUserId(userId) >= 3) {
            throw new RuntimeException("每个用户最多保存3副卡组");
        }
        validateOwnedDeck(userId, mainCardIds, null, null);
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("用户不存在"));

        Deck deck = new Deck();
        deck.setId("deck_" + UUID.randomUUID().toString().replace("-", ""));
        deck.setUser(user);
        deck.setName(requireName(name));
        deck.setCoverCardId(coverCardId);
        deck.setIsPreset(false);

        deck = deckRepository.save(deck);

        if (mainCardIds != null && !mainCardIds.isEmpty()) {
            List<DeckCard> deckCards = new ArrayList<>();
            for (int i = 0; i < mainCardIds.size(); i++) {
                DeckCard dc = new DeckCard();
                dc.setDeck(deck);
                dc.setCardId(mainCardIds.get(i));
                dc.setSlotType("main");
                dc.setPosition(i);
                deckCards.add(dc);
            }
            deckCardRepository.saveAll(deckCards);
        }

        return deck;
    }

    @Transactional
    public Deck updateDeck(String deckId, String name, String coverCardId,
                           List<String> mainCardIds, List<String> extraCardIds, List<String> sideCardIds) {
        Deck deck = deckRepository.findById(deckId)
            .orElseThrow(() -> new RuntimeException("卡组不存在"));
        validateOwnedDeck(deck.getUser().getId(), mainCardIds, extraCardIds, sideCardIds);

        if (name != null) deck.setName(name);
        if (coverCardId != null) deck.setCoverCardId(coverCardId);

        deckCardRepository.deleteByDeckId(deckId);

        List<DeckCard> allCards = new ArrayList<>();
        addSlotCards(deck, "main", mainCardIds, allCards);
        addSlotCards(deck, "extra", extraCardIds, allCards);
        addSlotCards(deck, "side", sideCardIds, allCards);
        deckCardRepository.saveAll(allCards);

        return deckRepository.save(deck);
    }

    private void addSlotCards(Deck deck, String slotType, List<String> cardIds, List<DeckCard> allCards) {
        if (cardIds == null) return;
        for (int i = 0; i < cardIds.size(); i++) {
            DeckCard dc = new DeckCard();
            dc.setDeck(deck);
            dc.setCardId(cardIds.get(i));
            dc.setSlotType(slotType);
            dc.setPosition(i);
            allCards.add(dc);
        }
    }

    @Transactional
    public void deleteDeck(String deckId) {
        deckCardRepository.deleteByDeckId(deckId);
        deckRepository.deleteById(deckId);
    }

    public List<String> getDeckCardIds(String deckId, String slotType) {
        List<DeckCard> deckCards = deckCardRepository.findByDeckIdAndSlotType(deckId, slotType);
        return deckCards.stream()
            .map(DeckCard::getCardId)
            .toList();
    }

    private void validateOwnedDeck(Long userId, List<String> mainCardIds,
                                   List<String> extraCardIds, List<String> sideCardIds) {
        if (mainCardIds == null || mainCardIds.size() < 40 || mainCardIds.size() > 60) {
            throw new RuntimeException("主卡组必须为40至60张");
        }
        if (extraCardIds != null && extraCardIds.size() > 15) {
            throw new RuntimeException("额外卡组最多15张");
        }
        if (sideCardIds != null && sideCardIds.size() > 15) {
            throw new RuntimeException("副卡组最多15张");
        }

        Map<String, Integer> ownedCounts = new HashMap<>();
        userCardRepository.findByUserId(userId).forEach(owned ->
            ownedCounts.put(owned.getCard().getId(), owned.getCount())
        );
        Map<String, Integer> deckCounts = new HashMap<>();
        validateCardSlot(mainCardIds, deckCounts, ownedCounts);
        validateCardSlot(extraCardIds, deckCounts, ownedCounts);
        validateCardSlot(sideCardIds, deckCounts, ownedCounts);
    }

    private void validateCardSlot(List<String> cardIds, Map<String, Integer> deckCounts,
                                  Map<String, Integer> ownedCounts) {
        if (cardIds == null) return;
        for (String cardId : cardIds) {
            if (cardId == null || cardId.isBlank()) {
                throw new RuntimeException("卡牌ID不能为空");
            }
            var card = cardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("卡牌不存在：" + cardId));
            if (!Boolean.TRUE.equals(card.getEnabled())) {
                throw new RuntimeException(card.getName() + "当前不可使用");
            }
            int count = deckCounts.merge(cardId, 1, Integer::sum);
            int owned = ownedCounts.getOrDefault(cardId, 0);
            if (owned <= 0) {
                throw new RuntimeException("你尚未拥有：" + card.getName());
            }
            if (count > owned) {
                throw new RuntimeException(card.getName() + "仅拥有" + owned + "张");
            }
            if (count > 3) {
                throw new RuntimeException(card.getName() + "最多放入3张");
            }
        }
    }

    private String requireName(String name) {
        if (name == null || name.isBlank() || name.trim().length() > 100) {
            throw new IllegalArgumentException("卡组名称不能为空且不能超过100个字符");
        }
        return name.trim();
    }
}
